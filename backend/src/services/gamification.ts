import prisma from "../lib/prisma";
import { DealStatus } from "@prisma/client";

export class GamificationService {
  private static readonly POINTS_PER_UPVOTE = 1;
  private static readonly POINTS_PER_DOWNVOTE = -1;
  private static readonly PENALTY_EXPIRED = 5;
  private static readonly PENALTY_FAKE = 25;

  static async handleVote(dealId: string) {
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

    await this.updateUserStats(deal.submittedById);
    await this.checkBadges(deal.submittedById);
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

    await this.updateUserStats(deal.submittedById);
  }

  static async updateUserStats(userId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

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

    const currentStats = await prisma.userStats.findUnique({
      where: { userId },
      select: { expiredPenalty: true, fakePenalty: true },
    });

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

    const badges = await prisma.badge.findMany();

    for (const badge of badges) {
      const criteria = badge.criteria as any;
      let eligible = false;

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

      if (eligible) {
        await prisma.userBadge.upsert({
          where: { userId_badgeId: { userId, badgeId: badge.id } },
          create: { userId, badgeId: badge.id },
          update: {}, // Already owned
        });
      }
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
