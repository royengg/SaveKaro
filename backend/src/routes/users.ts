import { Hono } from "hono";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { validate, getValidated } from "../middleware/validate";
import { updatePreferencesSchema, UpdatePreferencesInput } from "../schemas";
import { parsePaginationFromContext, createPaginationResponse } from "../lib/pagination";
import { successResponse, paginatedSuccessResponse } from "../lib/responses";
import { preferModernImageUrl } from "../lib/image";

const users = new Hono();

// Get lightweight signed-in home summary
users.get("/me/home-summary", requireAuth, async (c) => {
  const userId = c.get("userId")!;

  const [savedSignals, unreadNotificationCount] = await Promise.all([
    prisma.savedDeal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        deal: {
          select: {
            id: true,
            title: true,
            cleanTitle: true,
            brand: true,
            store: true,
            region: true,
            category: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
    }),
    prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    }),
  ]);

  return c.json(
    successResponse({
      unreadNotificationCount,
      savedSignals: savedSignals.map((entry) => entry.deal),
    }),
  );
});

// Get current user's saved deals
users.get("/me/saved", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const { page, limit, skip } = parsePaginationFromContext(c);

  const [savedDeals, total] = await Promise.all([
    prisma.savedDeal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        deal: {
          select: {
            id: true,
            title: true,
            cleanTitle: true,
            brand: true,
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
            redditScore: true,
            clickCount: true,
            upvoteCount: true,
            commentCount: true,
            createdAt: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                icon: true,
                color: true,
              },
            },
          },
        },
      },
    }),
    prisma.savedDeal.count({ where: { userId } }),
  ]);

  return c.json(
    paginatedSuccessResponse(
      savedDeals.map((sd: any) => {
        const { commentCount, ...deal } = sd.deal;
        return {
          ...deal,
          _count: {
            comments: commentCount,
          },
          imageUrl: preferModernImageUrl(deal.imageUrl),
        };
      }),
      createPaginationResponse(total, page, limit)
    )
  );
});

// Get current user's submitted deals
users.get("/me/submitted", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const { page, limit, skip } = parsePaginationFromContext(c);

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where: { submittedById: userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        cleanTitle: true,
        brand: true,
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
        redditScore: true,
        clickCount: true,
        upvoteCount: true,
        commentCount: true,
        createdAt: true,
        submittedById: true,
        category: {
          select: { id: true, name: true, slug: true, icon: true, color: true },
        },
      },
    }),
    prisma.deal.count({ where: { submittedById: userId } }),
  ]);

  return c.json(
    paginatedSuccessResponse(
      deals.map((deal: any) => {
        const { commentCount, ...dealData } = deal;
        return {
          ...dealData,
          _count: {
            comments: commentCount,
            upvotes: deal.upvoteCount,
          },
          imageUrl: preferModernImageUrl(dealData.imageUrl),
        };
      }),
      createPaginationResponse(total, page, limit)
    )
  );
});

// Update user preferences
users.put(
  "/me/preferences",
  requireAuth,
  validate(updatePreferencesSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const data = getValidated<UpdatePreferencesInput>(c);

    const preferences = await prisma.userPreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });

    return c.json(successResponse(preferences));
  },
);

// Get user preferences
users.get("/me/preferences", requireAuth, async (c) => {
  const userId = c.get("userId")!;

  let preferences = await prisma.userPreference.findUnique({
    where: { userId },
  });

  if (!preferences) {
    preferences = await prisma.userPreference.create({
      data: { userId },
    });
  }

  return c.json(successResponse(preferences));
});

// Get user stats
users.get("/me/stats", requireAuth, async (c) => {
  const userId = c.get("userId")!;

  const [savedCount, submittedCount, commentsCount, totalUpvotesReceived] =
    await Promise.all([
      prisma.savedDeal.count({ where: { userId } }),
      prisma.deal.count({ where: { submittedById: userId } }),
      prisma.comment.count({ where: { userId } }),
      prisma.deal.aggregate({
        where: { submittedById: userId },
        _sum: { upvoteCount: true },
      }),
    ]);

  return c.json(successResponse({
    savedDeals: savedCount,
    submittedDeals: submittedCount,
    comments: commentsCount,
    totalUpvotesReceived: totalUpvotesReceived._sum.upvoteCount || 0,
  }));
});

export default users;
