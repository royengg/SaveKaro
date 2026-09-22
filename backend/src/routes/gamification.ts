import { Hono, type Context } from "hono";
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
import { cacheGetOrSet, cacheInvalidate } from "../lib/cache";
import { CACHE_TTL } from "../config/constants";
import { setPublicCacheHeaders } from "../lib/http-cache";

const gamification = new Hono();

function setGamificationCacheHeaders(
  c: Context,
  ttlSeconds: number,
) {
  setPublicCacheHeaders(c, {
    maxAge: ttlSeconds,
    sMaxAge: ttlSeconds,
    staleWhileRevalidate: ttlSeconds,
    staleIfError: ttlSeconds * 5,
  });
}

gamification.get("/leaderboard", async (c) => {
  const rawLimit = parseInt(c.req.query("limit") || "100", 10);
  const limit = Math.min(Math.max(Number.isNaN(rawLimit) ? 100 : rawLimit, 1), 100);
  const leaderboard = await cacheGetOrSet(
    `leaderboard:${limit}`,
    CACHE_TTL.LEADERBOARD,
    () => GamificationService.getLeaderboard(limit),
  );

  setGamificationCacheHeaders(c, CACHE_TTL.LEADERBOARD);
  return c.json({ success: true, data: leaderboard });
});

gamification.get("/badges", async (c) => {
  const badges = await cacheGetOrSet(
    "gamification:badges",
    CACHE_TTL.GAMIFICATION_STATIC,
    () => prisma.badge.findMany(),
  );
  setGamificationCacheHeaders(c, CACHE_TTL.GAMIFICATION_STATIC);
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
    await cacheInvalidate("gamification:badges");

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
    await cacheInvalidate("gamification:challenges");

    return c.json({ success: true, data: challenge }, 201);
  },
);

gamification.get("/challenges", async (c) => {
  const challenges = await cacheGetOrSet(
    "gamification:challenges",
    CACHE_TTL.LEADERBOARD,
    () => {
      const now = new Date();
      return prisma.challenge.findMany({
        where: {
          isActive: true,
          endDate: { gte: now },
        },
        orderBy: { endDate: "asc" },
      });
    },
  );

  setGamificationCacheHeaders(c, CACHE_TTL.LEADERBOARD);
  return c.json({ success: true, data: challenges });
});

export default gamification;
