import { Hono } from "hono";
import prisma from "../lib/prisma";
import { GamificationService } from "../services/gamification";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/require-admin";
import { validate, getValidated } from "../middleware/validate";
import {
  createBadgeSchema,
  createChallengeSchema,
  CreateBadgeInput,
  CreateChallengeInput,
} from "../schemas";

const gamification = new Hono();

gamification.get("/leaderboard", async (c) => {
  const rawLimit = parseInt(c.req.query("limit") || "100", 10);
  const limit = Math.min(Number.isNaN(rawLimit) ? 100 : rawLimit, 100);
  const leaderboard = await GamificationService.getLeaderboard(limit);

  return c.json({ success: true, data: leaderboard });
});

gamification.get("/badges", async (c) => {
  const badges = await prisma.badge.findMany();
  return c.json({ success: true, data: badges });
});

gamification.get("/users/:userId/badges", async (c) => {
  const userId = c.req.param("userId");
  const badges = await prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true },
  });

  return c.json({ success: true, data: badges });
});

gamification.post(
  "/badges",
  requireAuth,
  requireAdmin,
  validate(createBadgeSchema),
  async (c) => {
    const data = getValidated<CreateBadgeInput>(c);
    const badge = await prisma.badge.create({ data });

    return c.json({ success: true, data: badge }, 201);
  },
);

gamification.post(
  "/challenges",
  requireAuth,
  requireAdmin,
  validate(createChallengeSchema),
  async (c) => {
    const data = getValidated<CreateChallengeInput>(c);
    const challenge = await prisma.challenge.create({
      data: {
        title: data.title,
        description: data.description,
        criteria: data.criteria,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });

    return c.json({ success: true, data: challenge }, 201);
  },
);

gamification.get("/challenges", async (c) => {
  const now = new Date();
  const challenges = await prisma.challenge.findMany({
    where: {
      isActive: true,
      endDate: { gte: now },
    },
    orderBy: { endDate: "asc" },
  });

  return c.json({ success: true, data: challenges });
});

export default gamification;
