import { Hono } from "hono";
import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { validate, getValidated } from "../middleware/validate";
import {
  submitRateLimiter,
  clickRateLimiter,
} from "../middleware/rate-limiter";
import {
  cacheGetOrSet,
  cacheInvalidate,
  cacheInvalidatePattern,
} from "../lib/cache";
import {
  createDealSchema,
  updateDealSchema,
  dealQuerySchema,
  homeDealQuerySchema,
  CreateDealInput,
  UpdateDealInput,
  DealQueryInput,
  HomeDealQueryInput,
} from "../schemas";
import { GamificationService } from "../services/gamification";
import { matchDealsAgainstAlerts } from "../services/alert-matcher";
import { stripHtml } from "../lib/sanitize";
import { injectAffiliateTag } from "../services/affiliate-service";
import { parsePaginationFromContext, createPaginationResponse } from "../lib/pagination";
import { successResponse, errorResponse, notFoundResponse } from "../lib/responses";
import { validateOwnershipOrAdmin } from "../lib/ownership";
import { DealManager } from "../services/deal-manager";
import { CACHE_TTL } from "../config/constants";
import { preferModernImageUrl } from "../lib/image";
import { resolveAmazonProductUrl } from "../services/amazon-url-service";
import { setNoStoreHeaders, setPublicCacheHeaders } from "../lib/http-cache";
import { getCanonicalStoreKey } from "../lib/store-key";
import logger from "../lib/logger";
import {
  captureServerEvent,
  getDealAnalyticsProperties,
} from "../lib/posthog";
import {
  buildDealCacheKey,
  buildHomeBootstrapCacheKey,
  buildDealsWhere,
  buildDealsOrderBy,
  getDealListSelect,
  toClientDeal,
  serializeDealsForClient,
  createDealsListResponse,
  buildStoreShowcaseWhere,
} from "../services/deal-query";

const deals = new Hono();
const HOME_STORE_SHOWCASE_LIMIT = 18;
const DEAL_DETAIL_CACHE_TTL_SECONDS = 60;
const PRICE_HISTORY_CACHE_TTL_SECONDS = 120;
const DEAL_SEARCH_CACHE_TTL_SECONDS = 30;
const USE_QUEUE = process.env.USE_QUEUE === "true";
const SERIALIZABLE_TRANSACTION_RETRIES = 3;

type VoteValue = 1 | -1 | 0;

type PriceHistoryLoadResult =
  | { found: false }
  | {
      found: true;
      response: {
        success: true;
        data: Array<{
          id: string;
          dealId: string;
          price: string;
          source: string | null;
          createdAt: string;
        }>;
        pagination: ReturnType<typeof createPaginationResponse>;
      };
    };

function runInBackground(task: Promise<unknown>, operation: string): void {
  void task.catch((error: unknown) => {
    logger.error({ error, operation }, "Background operation failed");
  });
}

async function refreshGamification(userId: string): Promise<void> {
  if (!USE_QUEUE) {
    runInBackground(
      GamificationService.refreshUser(userId),
      "gamification-refresh",
    );
    return;
  }

  try {
    const { queueGamificationRefresh } = await import("../services/queues");
    await queueGamificationRefresh({ userId });
  } catch (error) {
    logger.warn(
      { error, userId },
      "Could not enqueue gamification refresh; using in-process fallback",
    );
    runInBackground(
      GamificationService.refreshUser(userId),
      "gamification-refresh-fallback",
    );
  }
}

async function incrementClickCount(dealId: string): Promise<void> {
  try {
    await prisma.deal.update({
      where: { id: dealId },
      data: { clickCount: { increment: 1 } },
      select: { id: true },
    });
    await cacheInvalidate(`deals:detail:${dealId}`);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2025") {
      return;
    }
    throw error;
  }
}

async function recordDealClick(dealId: string): Promise<void> {
  if (!USE_QUEUE) {
    runInBackground(incrementClickCount(dealId), "deal-click");
    return;
  }

  try {
    const { queueDealClick } = await import("../services/queues");
    await queueDealClick(dealId);
  } catch (error) {
    if (
      (error as { code?: string }).code ===
      "CLICK_QUEUE_WRITE_STATE_UNKNOWN"
    ) {
      logger.error(
        { error, dealId },
        "Click queue write outcome is unknown; skipping fallback to avoid double counting",
      );
      return;
    }
    logger.warn(
      { error, dealId },
      "Could not enqueue deal click; using in-process fallback",
    );
    runInBackground(incrementClickCount(dealId), "deal-click-fallback");
  }
}

async function applyVote(
  userId: string,
  dealId: string,
  value: VoteValue,
) {
  for (let attempt = 1; attempt <= SERIALIZABLE_TRANSACTION_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const deal = await tx.deal.findUnique({
            where: { id: dealId },
            select: {
              id: true,
              submittedById: true,
              categoryId: true,
              store: true,
              storeKey: true,
              region: true,
              source: true,
              discountPercent: true,
              upvoteCount: true,
            },
          });

          if (!deal) return { status: "missing" as const };
          if (deal.submittedById === userId) {
            return { status: "self-vote" as const };
          }

          const existingVote = await tx.upvote.findUnique({
            where: { userId_dealId: { userId, dealId } },
            select: { value: true },
          });
          const previousValue = existingVote?.value ?? 0;
          const delta = value - previousValue;

          if (delta === 0) {
            return {
              status: "ok" as const,
              changed: false,
              upvoteCount: deal.upvoteCount,
              deal,
            };
          }

          if (value === 0) {
            await tx.upvote.delete({
              where: { userId_dealId: { userId, dealId } },
            });
          } else {
            await tx.upvote.upsert({
              where: { userId_dealId: { userId, dealId } },
              update: { value },
              create: { userId, dealId, value },
            });
          }

          const updatedDeal = await tx.deal.update({
            where: { id: dealId },
            data: { upvoteCount: { increment: delta } },
            select: { upvoteCount: true },
          });

          return {
            status: "ok" as const,
            changed: true,
            upvoteCount: updatedDeal.upvoteCount,
            deal,
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error: unknown) {
      const isRetryable = (error as { code?: string }).code === "P2034";
      if (!isRetryable || attempt === SERIALIZABLE_TRANSACTION_RETRIES) {
        throw error;
      }
    }
  }

  throw new Error("Vote transaction retry limit exceeded");
}


deals.get("/", validate(dealQuerySchema, "query"), async (c) => {
  const query = getValidated<DealQueryInput>(c);
  const { page, limit, search, sortBy, source, showInactive } = query;
  const isAdministrativeQuery = Boolean(showInactive || query.status);

  if (isAdministrativeQuery) {
    const user = c.get("user");
    if (!user) {
      return c.json({ success: false, error: "Authentication required" }, 401);
    }
    if (!user.isAdmin) {
      return c.json({ success: false, error: "Admin access required" }, 403);
    }
  }

  const cacheKey = buildDealCacheKey(query);
  if (search || isAdministrativeQuery) {
    setNoStoreHeaders(c);
  } else {
    setPublicCacheHeaders(c, {
      maxAge: CACHE_TTL.DEALS_LIST,
      sMaxAge: CACHE_TTL.DEALS_LIST,
      staleWhileRevalidate: CACHE_TTL.DEALS_LIST,
      staleIfError: CACHE_TTL.DEALS_LIST * 5,
    });
  }

  const skip = (page - 1) * limit;
  const where = buildDealsWhere(query);
  const orderBy = buildDealsOrderBy(sortBy);
  const includeSubmittedBy = showInactive || source === "USER_SUBMITTED";
  const loadDeals = async () => {
    const listRows = await prisma.deal.findMany({
      where,
      orderBy,
      skip,
      take: limit + 1,
      select: getDealListSelect(includeSubmittedBy),
    });
    return createDealsListResponse(listRows, page, limit);
  };
  const response = isAdministrativeQuery
    ? await loadDeals()
    : await cacheGetOrSet(
        cacheKey,
        search ? DEAL_SEARCH_CACHE_TTL_SECONDS : CACHE_TTL.DEALS_LIST,
        loadDeals,
      );

  return c.json(response);
});

deals.get("/home", validate(homeDealQuerySchema, "query"), async (c) => {
  const query = getValidated<HomeDealQueryInput>(c);
  const { limit, region, search, sortBy } = query;
  const cacheKey = buildHomeBootstrapCacheKey(query);

  if (search) {
    setNoStoreHeaders(c);
  } else {
    setPublicCacheHeaders(c, {
      maxAge: CACHE_TTL.DEALS_LIST,
      sMaxAge: CACHE_TTL.DEALS_LIST,
      staleWhileRevalidate: CACHE_TTL.DEALS_LIST,
      staleIfError: CACHE_TTL.DEALS_LIST * 5,
    });
  }

  const where = buildDealsWhere(query);
  const orderBy = buildDealsOrderBy(sortBy);

  const loadHome = async () => {
    const [feedRows, amazonRows, myntraRows] = await Promise.all([
      prisma.deal.findMany({
        where,
        orderBy,
        skip: 0,
        take: limit + 1,
        select: getDealListSelect(false),
      }),
      prisma.deal.findMany({
        where: buildStoreShowcaseWhere("amazon", region),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: HOME_STORE_SHOWCASE_LIMIT,
        select: getDealListSelect(false),
      }),
      region === "INDIA"
        ? prisma.deal.findMany({
            where: buildStoreShowcaseWhere("myntra", region),
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: HOME_STORE_SHOWCASE_LIMIT,
            select: getDealListSelect(false),
          })
        : Promise.resolve([]),
    ]);

    return {
      success: true,
      data: {
        feed: createDealsListResponse(feedRows, 1, limit),
        amazonDeals: serializeDealsForClient(amazonRows),
        myntraDeals: serializeDealsForClient(myntraRows),
      },
    };
  };
  const response = search
    ? await loadHome()
    : await cacheGetOrSet(cacheKey, CACHE_TTL.DEALS_LIST, loadHome);

  return c.json(response);
});

deals.get("/:id/price-history", async (c) => {
  const dealId = c.req.param("id");
  const { page, limit, skip } = parsePaginationFromContext(c, 30);
  const cacheKey = `deals:price-history:${dealId}:${page}:${limit}`;

  setPublicCacheHeaders(c, {
    maxAge: PRICE_HISTORY_CACHE_TTL_SECONDS,
    sMaxAge: PRICE_HISTORY_CACHE_TTL_SECONDS,
    staleWhileRevalidate: PRICE_HISTORY_CACHE_TTL_SECONDS,
    staleIfError: PRICE_HISTORY_CACHE_TTL_SECONDS * 5,
  });

  const result = await cacheGetOrSet<PriceHistoryLoadResult>(
    cacheKey,
    PRICE_HISTORY_CACHE_TTL_SECONDS,
    async () => {
      const [dealExists, priceHistory, total] = await Promise.all([
        prisma.deal.findUnique({
          where: { id: dealId },
          select: { id: true },
        }),
        prisma.priceHistory.findMany({
          where: { dealId },
          orderBy: { createdAt: "asc" },
          skip,
          take: limit,
        }),
        prisma.priceHistory.count({ where: { dealId } }),
      ]);

      if (!dealExists) return { found: false };

      return {
        found: true,
        response: {
          success: true,
          data: priceHistory.map((entry) => ({
            ...entry,
            price: entry.price.toString(),
            createdAt: entry.createdAt.toISOString(),
          })),
          pagination: createPaginationResponse(total, page, limit),
        },
      };
    },
  );

  if (!result.found) {
    return c.json(notFoundResponse("Deal"), 404);
  }

  return c.json(result.response);
});

deals.get("/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");
  const cacheKey = `deals:detail:${id}`;
  // CORS appends Origin; these keep personalized fields out of shared caches.
  c.header("Vary", "Authorization, Cookie");

  if (userId) {
    setNoStoreHeaders(c);
  } else {
    setPublicCacheHeaders(c, {
      maxAge: DEAL_DETAIL_CACHE_TTL_SECONDS,
      sMaxAge: DEAL_DETAIL_CACHE_TTL_SECONDS,
      staleWhileRevalidate: DEAL_DETAIL_CACHE_TTL_SECONDS,
      staleIfError: DEAL_DETAIL_CACHE_TTL_SECONDS * 5,
    });
  }

  const publicDeal = await cacheGetOrSet<Record<string, unknown> | null>(
    cacheKey,
    DEAL_DETAIL_CACHE_TTL_SECONDS,
    async () => {
      const deal = await prisma.deal.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          cleanTitle: true,
          brand: true,
          titleProcessedAt: true,
          description: true,
          originalPrice: true,
          dealPrice: true,
          discountPercent: true,
          productUrl: true,
          imageUrl: true,
          store: true,
          source: true,
          region: true,
          currency: true,
          redditPostId: true,
          redditScore: true,
          clickCount: true,
          upvoteCount: true,
          downvoteCount: true,
          status: true,
          isActive: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          commentCount: true,
          submittedById: true,
          category: {
            select: { id: true, name: true, slug: true, icon: true, color: true },
          },
          submittedBy: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });

      if (!deal) return null;

      return {
        ...toClientDeal(deal),
        _count: {
          comments: deal.commentCount,
          upvotes: deal.upvoteCount,
        },
        affiliateUrl: injectAffiliateTag(
          deal.productUrl,
          deal.store,
          deal.region,
        ),
        imageUrl: preferModernImageUrl(deal.imageUrl),
      };
    },
  );

  if (!publicDeal) {
    return c.json({ success: false, error: "Deal not found" }, 404);
  }

  let userUpvote = null;
  let userSaved = false;

  if (userId) {
    const [upvote, saved] = await Promise.all([
      prisma.upvote.findUnique({
        where: { userId_dealId: { userId, dealId: id } },
      }),
      prisma.savedDeal.findUnique({
        where: { userId_dealId: { userId, dealId: id } },
      }),
    ]);
    userUpvote = upvote?.value || null;
    userSaved = !!saved;
  }

  return c.json({
    success: true,
    data: {
      ...publicDeal,
      userUpvote,
      userSaved,
    },
  });
});

deals.post(
  "/",
  requireAuth,
  submitRateLimiter,
  validate(createDealSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const data = getValidated<CreateDealInput>(c);

    const { deal, created } = await DealManager.saveUserDeal(
      {
        ...data,
        title: stripHtml(data.title),
        description: data.description ? stripHtml(data.description) : undefined,
        store: data.store ? stripHtml(data.store) : undefined,
      },
      userId
    );

    matchDealsAgainstAlerts([deal]).catch((err: unknown) =>
      logger.error({ error: err }, "Alert matching failed"),
    );

    await cacheInvalidatePattern("deals:*");

    captureServerEvent(c, "deal:submit_complete", {
      ...getDealAnalyticsProperties(deal),
      created,
    });

    return c.json(
      successResponse(deal),
      created ? 201 : 200,
    );
  },
);

deals.put("/:id", requireAuth, validate(updateDealSchema), async (c) => {
  const userId = c.get("userId")!;
  const user = c.get("user")!;
  const id = c.req.param("id");
  const data = getValidated<UpdateDealInput>(c);
  const sanitizedStore =
    data.store !== undefined ? stripHtml(data.store) : undefined;
  const resolvedProductUrl = data.productUrl
    ? await resolveAmazonProductUrl(data.productUrl)
    : undefined;

  const existingDeal = await prisma.deal.findUnique({
    where: { id },
    select: { submittedById: true, store: true, productUrl: true },
  });

  if (!existingDeal) {
    return c.json(notFoundResponse("Deal"), 404);
  }

  const ownershipError = validateOwnershipOrAdmin(
    existingDeal.submittedById,
    userId,
    user.isAdmin
  );
  
  if (ownershipError) {
    return c.json(ownershipError, 403);
  }

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description !== undefined ? stripHtml(data.description) : undefined,
      originalPrice: data.originalPrice,
      dealPrice: data.dealPrice,
      discountPercent: data.discountPercent,
      imageUrl: data.imageUrl,
      categoryId: data.categoryId,
      region: data.region,
      store: sanitizedStore,
      storeKey: getCanonicalStoreKey({
        store: sanitizedStore ?? existingDeal.store,
        productUrl: resolvedProductUrl ?? existingDeal.productUrl,
      }),
      productUrl: resolvedProductUrl ?? undefined,
    },
    include: {
      category: {
        select: { id: true, name: true, slug: true, icon: true, color: true },
      },
    },
  });

  await cacheInvalidatePattern("deals:*");

  return c.json(successResponse(deal));
});

deals.delete("/:id", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const user = c.get("user")!;
  const id = c.req.param("id");

  const existingDeal = await prisma.deal.findUnique({
    where: { id },
    select: { submittedById: true },
  });

  if (!existingDeal) {
    return c.json(notFoundResponse("Deal"), 404);
  }

  const ownershipError = validateOwnershipOrAdmin(
    existingDeal.submittedById,
    userId,
    user.isAdmin
  );
  
  if (ownershipError) {
    return c.json(ownershipError, 403);
  }

  await prisma.deal.delete({ where: { id } });

  await cacheInvalidatePattern("deals:*");

  return c.json(successResponse({ message: "Deal deleted" }));
});

deals.post("/:id/vote", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const dealId = c.req.param("id");
  const body = await c.req
    .json<{ value: VoteValue }>()
    .catch(() => ({ value: undefined }));

  if (typeof body.value !== "number" || ![1, -1, 0].includes(body.value)) {
    return c.json(errorResponse("Invalid vote value"), 400);
  }

  const result = await applyVote(userId, dealId, body.value as VoteValue);

  if (result.status === "missing") {
    return c.json(notFoundResponse("Deal"), 404);
  }
  if (result.status === "self-vote") {
    return c.json(
      errorResponse("You cannot vote on your own deal"),
      403,
    );
  }

  if (result.changed) {
    runInBackground(
      cacheInvalidate(`deals:detail:${dealId}`),
      "deal-detail-cache-invalidation",
    );
    if (result.deal.submittedById) {
      runInBackground(
        refreshGamification(result.deal.submittedById),
        "gamification-refresh-dispatch",
      );
    }
  }

  captureServerEvent(c, "deal:vote_change", {
    ...getDealAnalyticsProperties(result.deal),
    vote_value: body.value,
    upvote_count: result.upvoteCount,
  });

  return c.json(successResponse({ upvoteCount: result.upvoteCount }));
});

// Native clients send the intended state so a repeated request is harmless.
deals.put("/:id/saved", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const dealId = c.req.param("id");
  const body: unknown = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object" || !("saved" in body) || typeof body.saved !== "boolean") {
    return c.json(errorResponse("saved must be a boolean"), 400);
  }

  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) return c.json(notFoundResponse("Deal"), 404);

  if (body.saved) {
    await prisma.savedDeal.upsert({
      where: { userId_dealId: { userId, dealId } },
      create: { userId, dealId },
      update: {},
    });
  } else {
    await prisma.savedDeal.deleteMany({ where: { userId, dealId } });
  }
  captureServerEvent(c, "deal:save_change", {
    ...getDealAnalyticsProperties(deal),
    saved: body.saved,
  });
  return c.json(successResponse({ saved: body.saved }));
});

deals.post("/:id/save", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const dealId = c.req.param("id");

  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) {
    return c.json(notFoundResponse("Deal"), 404);
  }

  const existing = await prisma.savedDeal.findUnique({
    where: { userId_dealId: { userId, dealId } },
  });

  if (existing) {
    await prisma.savedDeal.delete({
      where: { userId_dealId: { userId, dealId } },
    });
    captureServerEvent(c, "deal:save_change", {
      ...getDealAnalyticsProperties(deal),
      saved: false,
    });
    return c.json(successResponse({ saved: false }));
  } else {
    await prisma.savedDeal.create({
      data: { userId, dealId },
    });
    captureServerEvent(c, "deal:save_change", {
      ...getDealAnalyticsProperties(deal),
      saved: true,
    });
    return c.json(successResponse({ saved: true }));
  }
});

deals.post("/:id/click", clickRateLimiter, async (c) => {
  const dealId = c.req.param("id");

  // Telemetry is best-effort: avoid a Neon existence read before queueing.
  // Missing deals are ignored by the batch worker.
  runInBackground(recordDealClick(dealId), "deal-click-dispatch");
  captureServerEvent(c, "deal:merchant_click", {
    ...getDealAnalyticsProperties({ id: dealId }),
  });

  return c.json(successResponse({}));
});

export default deals;
