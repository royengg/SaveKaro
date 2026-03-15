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

const deals = new Hono();

// Get all deals with filtering, pagination, and search
deals.get("/", validate(dealQuerySchema, "query"), async (c) => {
  const query = getValidated<DealQueryInput>(c);
  const {
    page,
    limit,
    category,
    store,
    minDiscount,
    search,
    sortBy,
    region,
    source,
    status,
    showInactive,
  } = query;

  // Try cache first (only for non-search queries — search results change too fast)
  const cacheKey = `deals:${page}:${limit}:${category || ""}:${store || ""}:${minDiscount || ""}:${sortBy || "newest"}:${region || ""}:${source || ""}:${status || ""}:${showInactive || false}`;
  if (!search) {
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      return c.json(cached);
    }
  }

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};
  const andConditions: any[] = [];

  if (!showInactive) {
    where.isActive = true;
    // Exclude expired deals (expiresAt is null = never expires, or future date)
    andConditions.push({
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    });
  }

  // Filter by region if provided
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
    where.store = { contains: store, mode: "insensitive" };
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

  // Build order by
  let orderBy: any = { createdAt: "desc" };
  if (sortBy === "popular") {
    orderBy = { upvoteCount: "desc" };
  } else if (sortBy === "discount") {
    orderBy = { discountPercent: "desc" };
  }

  const includeSubmittedBy = showInactive || source === "USER_SUBMITTED";
  const listRows = await prisma.deal.findMany({
    where,
    orderBy,
    skip,
    take: limit + 1,
    select: {
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
      createdAt: true,
      category: {
        select: { id: true, name: true, slug: true, icon: true, color: true },
      },
      _count: {
        select: { comments: true },
      },
      ...(includeSubmittedBy
        ? {
            submittedBy: {
              select: { id: true, name: true, avatarUrl: true },
            },
          }
        : {}),
    },
  });

  const hasMore = listRows.length > limit;
  const dealsList = hasMore ? listRows.slice(0, limit) : listRows;
  const estimatedTotal = hasMore ? page * limit + 1 : skip + dealsList.length;
  const pagination = createPaginationResponse(estimatedTotal, page, limit);

  // Inject affiliate URLs at response time (DB stays clean)
  const dealsWithAffiliate = dealsList.map((deal) => ({
    ...deal,
    description: null,
    affiliateUrl: injectAffiliateTag(deal.productUrl, deal.store, deal.region),
    imageUrl: preferModernImageUrl(deal.imageUrl),
  }));

  const response = {
    success: true,
    data: dealsWithAffiliate,
    pagination: {
      ...pagination,
      hasMore,
    },
  };

  // Cache for 2 minutes (skip caching search results)
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

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      category: {
        select: { id: true, name: true, slug: true, icon: true, color: true },
      },
      submittedBy: {
        select: { id: true, name: true, avatarUrl: true },
      },
      _count: {
        select: { comments: true, upvotes: true },
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
      ...deal,
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

  // Check ownership
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
    false // We don't have admin flag here, but the delete endpoint handles admin access
  );
  
  if (ownershipError) {
    return c.json(ownershipError, 403);
  }

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      ...data,
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
