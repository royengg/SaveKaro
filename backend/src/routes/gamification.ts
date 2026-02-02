import { Hono } from "hono";
import prisma from "../lib/prisma";
import { GamificationService } from "../services/gamification";
import { requireAuth } from "../middleware/auth";

const gamification = new Hono();

// Get Leaderboard
gamification.get("/leaderboard", async (c) => {
  const limit = Math.min(Number(c.req.query("limit")) || 100, 100);
  const leaderboard = await GamificationService.getLeaderboard(limit);

  return c.json({ success: true, data: leaderboard });
});

// Get Badges
gamification.get("/badges", async (c) => {
  const badges = await prisma.badge.findMany();
  return c.json({ success: true, data: badges });
});

// Get User Badges
gamification.get("/users/:userId/badges", async (c) => {
  const userId = c.req.param("userId");
  const badges = await prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true },
  });

  return c.json({ success: true, data: badges });
});

// Admin: Create Badge
gamification.post("/badges", requireAuth, async (c) => {
  const userId = c.get("userId");
  const user = await prisma.user.findUnique({
    where: { id: userId as string },
  });

  if (!user?.isAdmin) {
    return c.json({ success: false, error: "Unauthorized" }, 403);
  }

  const body = await c.req.json();
  const badge = await prisma.badge.create({ data: body });

  return c.json({ success: true, data: badge });
});

// Admin: Create Challenge
gamification.post("/challenges", requireAuth, async (c) => {
  const userId = c.get("userId");
  const user = await prisma.user.findUnique({
    where: { id: userId as string },
  });

  if (!user?.isAdmin) {
    return c.json({ success: false, error: "Unauthorized" }, 403);
  }

  const body = await c.req.json();
  const challenge = await prisma.challenge.create({
    data: {
      ...body,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
    },
  });

  return c.json({ success: true, data: challenge });
});

// Get Active Challenges
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
