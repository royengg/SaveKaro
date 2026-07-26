import { Hono } from "hono";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { validate, getValidated } from "../middleware/validate";
import {
  submitRateLimiter,
  clickRateLimiter,
} from "../middleware/rate-limiter";
import { cacheGet, cacheSet, cacheInvalidatePattern } from "../lib/cache";
import {
  createDealSchema,
  updateDealSchema,
  dealQuerySchema,
  CreateDealInput,
  UpdateDealInput,
  DealQueryInput,
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


deals.get("/", validate(dealQuerySchema, "query"), async (c) => {
  const query = getValidated<DealQueryInput>(c);
  const { page, limit, search, sortBy, source, showInactive } = query;

  // Try cache first (only for non-search queries — search results change too fast)
  const cacheKey = buildDealCacheKey(query);
  if (!search) {
    setPublicCacheHeaders(c, {
      maxAge: CACHE_TTL.DEALS_LIST,
      sMaxAge: CACHE_TTL.DEALS_LIST,
      staleWhileRevalidate: CACHE_TTL.DEALS_LIST,
      staleIfError: CACHE_TTL.DEALS_LIST * 5,
    });
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      return c.json(cached);
    }
  } else {
    setNoStoreHeaders(c);
  }

  const skip = (page - 1) * limit;
  const where = buildDealsWhere(query);
  const orderBy = buildDealsOrderBy(sortBy);

  const includeSubmittedBy = showInactive || source === "USER_SUBMITTED";
  const listRows = await prisma.deal.findMany({
    where,
    orderBy,
    skip,
    take: limit + 1,
    select: getDealListSelect(includeSubmittedBy),
  });

  const response = createDealsListResponse(listRows, page, limit);

  if (!search) {
    await cacheSet(cacheKey, response, CACHE_TTL.DEALS_LIST);
  }

  return c.json(response);
});

deals.get("/home", validate(dealQuerySchema, "query"), async (c) => {
  const query = getValidated<DealQueryInput>(c);
  const { limit, region, search, sortBy } = query;
  const cacheKey = buildHomeBootstrapCacheKey(query);

  if (!search) {
    setPublicCacheHeaders(c, {
      maxAge: CACHE_TTL.DEALS_LIST,
      sMaxAge: CACHE_TTL.DEALS_LIST,
      staleWhileRevalidate: CACHE_TTL.DEALS_LIST,
      staleIfError: CACHE_TTL.DEALS_LIST * 5,
    });
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      return c.json(cached);
    }
  } else {
    setNoStoreHeaders(c);
  }

  const where = buildDealsWhere(query);
  const orderBy = buildDealsOrderBy(sortBy);

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

  const response = {
    success: true,
    data: {
      feed: createDealsListResponse(feedRows, 1, limit),
      amazonDeals: serializeDealsForClient(amazonRows),
      myntraDeals: serializeDealsForClient(myntraRows),
    },
  };

  if (!search) {
    await cacheSet(cacheKey, response, CACHE_TTL.DEALS_LIST);
  }

  return c.json(response);
});

deals.get("/:id/price-history", async (c) => {
  const dealId = c.req.param("id");
  const { page, limit, skip } = parsePaginationFromContext(c, 30);

  const dealExists = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { id: true },
  });

  if (!dealExists) {
    return c.json(notFoundResponse("Deal"), 404);
  }

  const [priceHistory, total] = await Promise.all([
    prisma.priceHistory.findMany({
      where: { dealId },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.priceHistory.count({ where: { dealId } }),
  ]);

  return c.json({
    success: true,
    data: priceHistory,
    pagination: createPaginationResponse(total, page, limit),
  });
});

deals.get("/:id", async (c) => {
  const id = c.req.param("id");
  const userId = c.get("userId");

  setNoStoreHeaders(c);

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

  if (!deal) {
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
  const body = await c.req.json<{ value: 1 | -1 | 0 }>().catch(() => ({ value: undefined as any }));

  if (![1, -1, 0].includes(body.value)) {
    return c.json(errorResponse("Invalid vote value"), 400);
  }

  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) {
    return c.json(notFoundResponse("Deal"), 404);
  }

  // Prevent self-votes
  if (deal.submittedById === userId) {
    return c.json(
      errorResponse("You cannot vote on your own deal"),
      403,
    );
  }

  // Atomic transaction: vote + recalculate count
  const upvoteCount = await prisma.$transaction(async (tx) => {
    if (body.value === 0) {
      await tx.upvote.deleteMany({ where: { userId, dealId } });
    } else {
      await tx.upvote.upsert({
        where: { userId_dealId: { userId, dealId } },
        update: { value: body.value },
        create: { userId, dealId, value: body.value },
      });
    }

    const result = await tx.upvote.aggregate({
      where: { dealId },
      _sum: { value: true },
    });
    const newCount = result._sum.value || 0;

    await tx.deal.update({
      where: { id: dealId },
      data: { upvoteCount: newCount },
    });

    return newCount;
  });

  // Gamification hook (outside transaction — non-critical)
  await GamificationService.handleVote(dealId);

  return c.json(successResponse({ upvoteCount }));
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
    return c.json(successResponse({ saved: false }));
  } else {
    await prisma.savedDeal.create({
      data: { userId, dealId },
    });
    return c.json(successResponse({ saved: true }));
  }
});

deals.post("/:id/click", clickRateLimiter, async (c) => {
  const dealId = c.req.param("id");

  try {
    await prisma.deal.update({
      where: { id: dealId },
      data: { clickCount: { increment: 1 } },
    });
  } catch (err: any) {
    if (err?.code === "P2025") {
      return c.json(notFoundResponse("Deal"), 404);
    }
    throw err;
  }

  return c.json(successResponse({}));
});

export default deals;
