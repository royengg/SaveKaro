import { Hono } from "hono";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { validate, getValidated } from "../middleware/validate";
import { submitRateLimiter, clickRateLimiter } from "../middleware/rateLimiter";
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
import { matchDealsAgainstAlerts } from "../services/alertMatcher";
import { stripHtml } from "../lib/sanitize";
import { injectAffiliateTag } from "../services/affiliateService";

const deals = new Hono();

// Get all deals with filtering, pagination, and search
deals.get("/", validate(dealQuerySchema, "query"), async (c) => {
  const query = getValidated<DealQueryInput>(c);
  const { page, limit, category, store, minDiscount, search, sortBy, region } =
    query;

  // Try cache first (only for non-search queries — search results change too fast)
  const cacheKey = `deals:${page}:${limit}:${category || ""}:${store || ""}:${minDiscount || ""}:${sortBy || "newest"}:${region || ""}`;
  if (!search) {
    const cached = await cacheGet<any>(cacheKey);
    if (cached) {
      return c.json(cached);
    }
  }

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {
    isActive: true,
    // Exclude expired deals (expiresAt is null = never expires, or future date)
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };

  // Filter by region if provided
  if (region) {
    where.region = region;
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
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { store: { contains: search, mode: "insensitive" } },
    ];
  }

  // Build order by
  let orderBy: any = { createdAt: "desc" };
  if (sortBy === "popular") {
    orderBy = { upvoteCount: "desc" };
  } else if (sortBy === "discount") {
    orderBy = { discountPercent: "desc" };
  }

  const [dealsList, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        category: {
          select: { id: true, name: true, slug: true, icon: true, color: true },
        },
        submittedBy: {
          select: { id: true, name: true, avatarUrl: true },
        },
        _count: {
          select: { comments: true },
        },
      },
    }),
    prisma.deal.count({ where }),
  ]);

  // Inject affiliate URLs at response time (DB stays clean)
  const dealsWithAffiliate = dealsList.map((deal) => ({
    ...deal,
    affiliateUrl: injectAffiliateTag(deal.productUrl, deal.store, deal.region),
  }));

  const response = {
    success: true,
    data: dealsWithAffiliate,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };

  // Cache for 2 minutes (skip caching search results)
  if (!search) {
    await cacheSet(cacheKey, response, 120);
  }

  return c.json(response);
});

// Get a single deal by ID
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
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
          replies: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      priceHistory: {
        orderBy: { createdAt: "asc" },
        take: 30,
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

    const deal = await prisma.deal.create({
      data: {
        ...data,
        title: stripHtml(data.title),
        description: data.description ? stripHtml(data.description) : null,
        store: data.store ? stripHtml(data.store) : undefined,
        source: "USER_SUBMITTED",
        submittedById: userId,
        originalPrice: data.originalPrice ? data.originalPrice : null,
        dealPrice: data.dealPrice ? data.dealPrice : null,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true, icon: true, color: true },
        },
        submittedBy: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    // Add initial price to history if dealPrice is provided
    if (data.dealPrice) {
      await prisma.priceHistory.create({
        data: {
          dealId: deal.id,
          price: data.dealPrice,
          source: "user_submission",
        },
      });
    }

    // Match against user price alerts (fire-and-forget)
    matchDealsAgainstAlerts([deal]).catch((err: unknown) =>
      console.error("Alert matching failed:", err),
    );

    return c.json({ success: true, data: deal }, 201);
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
    return c.json({ success: false, error: "Deal not found" }, 404);
  }

  if (existingDeal.submittedById !== userId) {
    return c.json({ success: false, error: "Not authorized" }, 403);
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

  return c.json({ success: true, data: deal });
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
    return c.json({ success: false, error: "Deal not found" }, 404);
  }

  if (existingDeal.submittedById !== userId && !user.isAdmin) {
    return c.json({ success: false, error: "Not authorized" }, 403);
  }

  await prisma.deal.delete({ where: { id } });

  return c.json({ success: true, message: "Deal deleted" });
});

// Upvote/downvote a deal
deals.post("/:id/vote", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const dealId = c.req.param("id");
  const body = await c.req.json<{ value: 1 | -1 | 0 }>();

  if (![1, -1, 0].includes(body.value)) {
    return c.json({ success: false, error: "Invalid vote value" }, 400);
  }

  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) {
    return c.json({ success: false, error: "Deal not found" }, 404);
  }

  // Prevent self-votes
  if (deal.submittedById === userId) {
    return c.json(
      { success: false, error: "You cannot vote on your own deal" },
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

  return c.json({
    success: true,
    data: { upvoteCount },
  });
});

// Save/unsave a deal
deals.post("/:id/save", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const dealId = c.req.param("id");

  const deal = await prisma.deal.findUnique({ where: { id: dealId } });
  if (!deal) {
    return c.json({ success: false, error: "Deal not found" }, 404);
  }

  const existing = await prisma.savedDeal.findUnique({
    where: { userId_dealId: { userId, dealId } },
  });

  if (existing) {
    await prisma.savedDeal.delete({
      where: { userId_dealId: { userId, dealId } },
    });
    return c.json({ success: true, data: { saved: false } });
  } else {
    await prisma.savedDeal.create({
      data: { userId, dealId },
    });
    return c.json({ success: true, data: { saved: true } });
  }
});

// Track deal click (rate limited to prevent inflation)
deals.post("/:id/click", clickRateLimiter, async (c) => {
  const dealId = c.req.param("id");

  await prisma.deal.update({
    where: { id: dealId },
    data: { clickCount: { increment: 1 } },
  });

  return c.json({ success: true });
});

export default deals;
