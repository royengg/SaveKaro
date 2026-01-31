import { Hono } from "hono";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { validate, getValidated } from "../middleware/validate";
import { updatePreferencesSchema, UpdatePreferencesInput } from "../schemas";

const users = new Hono();

// Get current user's saved deals
users.get("/me/saved", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const skip = (page - 1) * limit;

  const [savedDeals, total] = await Promise.all([
    prisma.savedDeal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        deal: {
          include: {
            category: {
              select: { id: true, name: true, slug: true, icon: true, color: true },
            },
            _count: {
              select: { comments: true },
            },
          },
        },
      },
    }),
    prisma.savedDeal.count({ where: { userId } }),
  ]);

  return c.json({
    success: true,
    data: savedDeals.map((sd) => sd.deal),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Get current user's submitted deals
users.get("/me/submitted", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const skip = (page - 1) * limit;

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where: { submittedById: userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        category: {
          select: { id: true, name: true, slug: true, icon: true, color: true },
        },
        _count: {
          select: { comments: true, upvotes: true },
        },
      },
    }),
    prisma.deal.count({ where: { submittedById: userId } }),
  ]);

  return c.json({
    success: true,
    data: deals,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// Update user preferences
users.put("/me/preferences", requireAuth, validate(updatePreferencesSchema), async (c) => {
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

  return c.json({ success: true, data: preferences });
});

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

  return c.json({ success: true, data: preferences });
});

// Get user stats
users.get("/me/stats", requireAuth, async (c) => {
  const userId = c.get("userId")!;

  const [savedCount, submittedCount, commentsCount, totalUpvotesReceived] = await Promise.all([
    prisma.savedDeal.count({ where: { userId } }),
    prisma.deal.count({ where: { submittedById: userId } }),
    prisma.comment.count({ where: { userId } }),
    prisma.deal.aggregate({
      where: { submittedById: userId },
      _sum: { upvoteCount: true },
    }),
  ]);

  return c.json({
    success: true,
    data: {
      savedDeals: savedCount,
      submittedDeals: submittedCount,
      comments: commentsCount,
      totalUpvotesReceived: totalUpvotesReceived._sum.upvoteCount || 0,
    },
  });
});

export default users;
