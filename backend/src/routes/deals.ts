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
import { successResponse, errorResponse, notFoundResponse, unauthorizedResponse } from "../lib/responses";
import { validateOwnershipOrAdmin } from "../lib/ownership";
import { DealManager } from "../services/deal-manager";
import { CACHE_TTL } from "../config/constants";
import { preferModernImageUrl } from "../lib/image";
import { resolveAmazonProductUrl } from "../services/amazon-url-service";
import { setNoStoreHeaders, setPublicCacheHeaders } from "../lib/http-cache";
import { getCanonicalStoreKey, getStoreKeyFromFilter } from "../lib/store-key";

const deals = new Hono();
const HOME_STORE_SHOWCASE_LIMIT = 18;

function getActiveDealCondition() {
  return {
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };
}

function buildDealCacheKey(query: DealQueryInput) {
  return `deals:${query.page}:${query.limit}:${query.category || ""}:${query.store || ""}:${query.minDiscount || ""}:${query.sortBy || "newest"}:${query.region || ""}:${query.source || ""}:${query.status || ""}:${query.showInactive || false}`;
}

function buildHomeBootstrapCacheKey(query: DealQueryInput) {
  return `deals:home:${query.limit}:${query.category || ""}:${query.store || ""}:${query.minDiscount || ""}:${query.sortBy || "newest"}:${query.region || ""}:${query.search || ""}`;
}

function buildDealsWhere(query: DealQueryInput) {
  const {
    category,
    store,
    minDiscount,
    search,
    region,
    source,
    status,
    showInactive,
  } = query;

  const where: any = {};
  const andConditions: any[] = [];

  if (!showInactive) {
    where.isActive = true;
    andConditions.push(getActiveDealCondition());
  }

  if (region) {
    where.region = region;
  }

  if (source) {
    where.source = source;
  }

  if (status) {
    where.status = status;
  }

  if (category) {
    where.category = { slug: category };
  }

  if (store) {
    const storeKey = getStoreKeyFromFilter(store);
    if (storeKey) {
      where.storeKey = storeKey;
    } else {
      where.store = { contains: store, mode: "insensitive" };
    }
  }

  if (minDiscount) {
    where.discountPercent = { gte: minDiscount };
  }

  if (search) {
    andConditions.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { store: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}

function buildDealsOrderBy(sortBy: DealQueryInput["sortBy"]) {
  if (sortBy === "popular") {
    return [
      { upvoteCount: "desc" as const },
      { createdAt: "desc" as const },
      { id: "desc" as const },
    ];
  }

  if (sortBy === "discount") {
    return [
      { discountPercent: "desc" as const },
      { createdAt: "desc" as const },
      { id: "desc" as const },
    ];
  }

  return [{ createdAt: "desc" as const }, { id: "desc" as const }];
}

function getDealListSelect(includeSubmittedBy: boolean) {
  return {
    id: true,
    title: true,
    cleanTitle: true,
    brand: true,
    originalPrice: true,
    dealPrice: true,
    discountPercent: true,
    productUrl: true,
    imageUrl: true,
    store: true,
    source: true,
    region: true,
    currency: true,
    redditScore: true,
    clickCount: true,
    upvoteCount: true,
    commentCount: true,
    createdAt: true,
    category: {
      select: { id: true, name: true, slug: true, icon: true, color: true },
    },
    ...(includeSubmittedBy
      ? {
          submittedBy: {
            select: { id: true, name: true, avatarUrl: true },
          },
        }
      : {}),
  };
}

function toClientDeal<T extends Record<string, any>>(deal: T) {
  const { commentCount, _count, ...rest } = deal;
  const comments =
    typeof commentCount === "number" ? commentCount : _count?.comments;

  return {
    ...rest,
    ...(typeof comments === "number"
      ? {
          _count: {
            ...(_count ?? {}),
            comments,
          },
        }
      : _count
        ? { _count }
        : {}),
  };
}

function serializeDealsForClient<T extends Record<string, any>>(dealsList: T[]) {
  return dealsList.map((deal) => ({
    ...toClientDeal(deal),
    description: null,
    affiliateUrl: injectAffiliateTag(deal.productUrl, deal.store, deal.region),
    imageUrl: preferModernImageUrl(deal.imageUrl),
  }));
}

function createDealsListResponse<T extends Record<string, any>>(
  listRows: T[],
  page: number,
  limit: number,
) {
  const hasMore = listRows.length > limit;
  const dealsList = hasMore ? listRows.slice(0, limit) : listRows;
  const estimatedTotal = hasMore ? page * limit + 1 : (page - 1) * limit + dealsList.length;
  const pagination = createPaginationResponse(estimatedTotal, page, limit);

  return {
    success: true,
    data: serializeDealsForClient(dealsList),
    pagination: {
      ...pagination,
      hasMore,
    },
  };
}

function buildStoreShowcaseWhere(
  storeKey: "amazon" | "myntra",
  region?: DealQueryInput["region"],
) {
  return {
    isActive: true,
    storeKey,
    ...(region ? { region } : {}),
    AND: [getActiveDealCondition()],
  };
}

// Get all deals with filtering, pagination, and search
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

  // Cache for 2 minutes (skip caching search results)
  if (!search) {
    await cacheSet(cacheKey, response, CACHE_TTL.DEALS_LIST);
  }

  return c.json(response);
});

// Get home bootstrap payload (feed page 1 + store sections)
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

// Get deal price history (staged fetch for detail page)
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

// Get a single deal by ID (core payload only)
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

  // Check if user has upvoted/saved this deal
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

// Submit a new deal (authenticated)
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

    // Match against user price alerts (fire-and-forget)
    matchDealsAgainstAlerts([deal]).catch((err: unknown) =>
      console.error("Alert matching failed:", err),
    );

    await cacheInvalidatePattern("deals:*");

    return c.json(
      successResponse(deal),
      created ? 201 : 200,
    );
  },
);

// Update a deal (only owner or admin)
deals.put("/:id", requireAuth, validate(updateDealSchema), async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const data = getValidated<UpdateDealInput>(c);
  const sanitizedStore =
    data.store !== undefined ? stripHtml(data.store) : undefined;
  const resolvedProductUrl = data.productUrl
    ? await resolveAmazonProductUrl(data.productUrl)
    : undefined;

  // Check ownership
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
    false // We don't have admin flag here, but the delete endpoint handles admin access
  );
  
  if (ownershipError) {
    return c.json(ownershipError, 403);
  }

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      ...data,
      store: sanitizedStore,
      storeKey: getCanonicalStoreKey({
        store: sanitizedStore ?? existingDeal.store,
        productUrl: resolvedProductUrl ?? existingDeal.productUrl,
      }),
      productUrl: resolvedProductUrl ?? undefined,
      originalPrice:
        data.originalPrice !== undefined ? data.originalPrice : undefined,
      dealPrice: data.dealPrice !== undefined ? data.dealPrice : undefined,
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

// Delete a deal (owner or admin)
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

// Upvote/downvote a deal
deals.post("/:id/vote", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const dealId = c.req.param("id");
  const body = await c.req.json<{ value: 1 | -1 | 0 }>();

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

    // Recalculate count inside same transaction
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
  await GamificationService.handleVote(dealId, body.value);

  return c.json(successResponse({ upvoteCount }));
});

// Save/unsave a deal
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

// Track deal click (rate limited to prevent inflation)
deals.post("/:id/click", clickRateLimiter, async (c) => {
  const dealId = c.req.param("id");

  await prisma.deal.update({
    where: { id: dealId },
    data: { clickCount: { increment: 1 } },
  });

  return c.json(successResponse({}));
});

export default deals;
