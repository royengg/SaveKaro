import prisma from "../lib/prisma";
import { DealStatus } from "@prisma/client";
import { cacheInvalidatePattern } from "../lib/cache";

interface BadgeCriteria {
  type?: "reputation" | "deals_count";
  threshold?: number;
}

export class GamificationService {
  private static readonly POINTS_PER_UPVOTE = 1;
  private static readonly POINTS_PER_DOWNVOTE = -1;
  private static readonly PENALTY_EXPIRED = 5;
  private static readonly PENALTY_FAKE = 25;

  static async handleVote(dealId: string) {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      select: { submittedById: true },
    });

    if (!deal || !deal.submittedById) return;

    await this.refreshUser(deal.submittedById);
  }

  static async refreshUser(userId: string) {
    await this.updateUserStats(userId);
    try {
      await this.checkBadges(userId);
    } finally {
      await cacheInvalidatePattern("leaderboard:*");
    }
  }

  static async handleDealStatusChange(dealId: string, status: DealStatus) {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      select: { submittedById: true },
    });

    if (!deal || !deal.submittedById) return;

    if (status === DealStatus.EXPIRED || status === DealStatus.FAKE) {
      await prisma.userStats.upsert({
        where: { userId: deal.submittedById },
        create: {
          userId: deal.submittedById,
          expiredPenalty: status === DealStatus.EXPIRED ? 1 : 0,
          fakePenalty: status === DealStatus.FAKE ? 1 : 0,
        },
        update: {
          expiredPenalty: { increment: status === DealStatus.EXPIRED ? 1 : 0 },
          fakePenalty: { increment: status === DealStatus.FAKE ? 1 : 0 },
        },
      });
    }

    await this.refreshUser(deal.submittedById);
  }

  static async updateUserStats(userId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [weeklyActivity, currentStats] = await Promise.all([
      prisma.deal.aggregate({
        where: {
          submittedById: userId,
          createdAt: { gte: sevenDaysAgo },
        },
        _count: { id: true },
        _sum: { upvoteCount: true, downvoteCount: true },
      }),
      prisma.userStats.findUnique({
        where: { userId },
        select: { expiredPenalty: true, fakePenalty: true },
      }),
    ]);

    const weeklyUpvotes = weeklyActivity._sum.upvoteCount ?? 0;
    const weeklyDownvotes = weeklyActivity._sum.downvoteCount ?? 0;
    const weeklyDeals = weeklyActivity._count.id;

    const expiredPenalty = currentStats?.expiredPenalty || 0;
    const fakePenalty = currentStats?.fakePenalty || 0;

    const reputationScore =
      weeklyUpvotes * this.POINTS_PER_UPVOTE +
      weeklyDownvotes * this.POINTS_PER_DOWNVOTE -
      expiredPenalty * this.PENALTY_EXPIRED -
      fakePenalty * this.PENALTY_FAKE;

    await prisma.userStats.upsert({
      where: { userId },
      create: {
        userId,
        weeklyUpvotes,
        weeklyDownvotes,
        weeklyDeals,
        reputationScore,
      },
      update: {
        weeklyUpvotes,
        weeklyDownvotes,
        weeklyDeals,
        reputationScore,
        lastUpdated: new Date(),
      },
    });
  }

  static async checkBadges(userId: string) {
    const stats = await prisma.userStats.findUnique({ where: { userId } });
    if (!stats) return;

    const badges = await prisma.badge.findMany({
      select: { id: true, criteria: true },
    });
    const eligibleBadges = badges.filter((badge) => {
      const criteria = badge.criteria as BadgeCriteria;
      if (typeof criteria.threshold !== "number") return false;

      return (
        (criteria.type === "reputation" &&
          stats.reputationScore >= criteria.threshold) ||
        (criteria.type === "deals_count" &&
          stats.weeklyDeals >= criteria.threshold)
      );
    });

    if (eligibleBadges.length > 0) {
      await prisma.userBadge.createMany({
        data: eligibleBadges.map((badge) => ({
          userId,
          badgeId: badge.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  static async getLeaderboard(limit = 100) {
    return prisma.userStats.findMany({
      orderBy: { reputationScore: "desc" },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });
  }
}
