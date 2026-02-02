import prisma from "../lib/prisma";
import { BadgeTier, DealStatus } from "@prisma/client";

export class GamificationService {
  // Constants
  private static readonly POINTS_PER_UPVOTE = 1;
  private static readonly POINTS_PER_DOWNVOTE = -1;
  private static readonly PENALTY_EXPIRED = 5;
  private static readonly PENALTY_FAKE = 25;

  /**
   * Handle user voting on a deal
   */
  static async handleVote(dealId: string, value: number) {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      select: {
        submittedById: true,
        id: true,
        upvoteCount: true,
        downvoteCount: true,
      },
    });

    if (!deal || !deal.submittedById) return;

    // Recalculate user stats
    await this.updateUserStats(deal.submittedById);
    await this.checkBadges(deal.submittedById);
  }

  /**
   * Handle deal status change (expired/fake)
   */
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

    await this.updateUserStats(deal.submittedById);
  }

  /**
   * Update user stats based on rolling 7-day window
   */
  static async updateUserStats(userId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get all deals submitted by user in last 7 days
    const deals = await prisma.deal.findMany({
      where: {
        submittedById: userId,
        createdAt: { gte: sevenDaysAgo },
      },
      select: { upvoteCount: true, downvoteCount: true },
    });

    const weeklyUpvotes = deals.reduce(
      (acc, deal) => acc + deal.upvoteCount,
      0,
    );
    const weeklyDownvotes = deals.reduce(
      (acc, deal) => acc + deal.downvoteCount,
      0,
    );
    const weeklyDeals = deals.length;

    // Get penalties
    const currentStats = await prisma.userStats.findUnique({
      where: { userId },
      select: { expiredPenalty: true, fakePenalty: true },
    });

    const expiredPenalty = currentStats?.expiredPenalty || 0;
    const fakePenalty = currentStats?.fakePenalty || 0;

    // Calculate score
    const reputationScore =
      weeklyUpvotes * this.POINTS_PER_UPVOTE +
      weeklyDownvotes * this.POINTS_PER_DOWNVOTE -
      expiredPenalty * this.PENALTY_EXPIRED -
      fakePenalty * this.PENALTY_FAKE;

    // Update stats
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

  /**
   * Check and award badges
   */
  static async checkBadges(userId: string) {
    const stats = await prisma.userStats.findUnique({ where: { userId } });
    if (!stats) return;

    const badges = await prisma.badge.findMany();

    for (const badge of badges) {
      const criteria = badge.criteria as any;
      let eligible = false;

      // Logic for different badge types
      if (
        criteria.type === "reputation" &&
        stats.reputationScore >= criteria.threshold
      ) {
        eligible = true;
      } else if (
        criteria.type === "deals_count" &&
        stats.weeklyDeals >= criteria.threshold
      ) {
        eligible = true;
      }

      // Add more criteria logic here (hot_finder, etc.)

      if (eligible) {
        // Award badge if not already owned
        await prisma.userBadge.upsert({
          where: { userId_badgeId: { userId, badgeId: badge.id } },
          create: { userId, badgeId: badge.id },
          update: {}, // Already owned
        });
      }
    }
  }

  /**
   * Get Leaderboard
   */
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
