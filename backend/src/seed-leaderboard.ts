import { PrismaClient } from "@prisma/client";

const leaderboardPlayers = [
  {
    name: "Riya Saver",
    slug: "riya-saver",
    weeklyUpvotes: 1512,
    weeklyDownvotes: 7,
    weeklyDeals: 38,
    expiredPenalty: 1,
    fakePenalty: 0,
  },
  {
    name: "Kabir Coupons",
    slug: "kabir-coupons",
    weeklyUpvotes: 1400,
    weeklyDownvotes: 20,
    weeklyDeals: 35,
    expiredPenalty: 1,
    fakePenalty: 0,
  },
  {
    name: "Sneha Steals",
    slug: "sneha-steals",
    weeklyUpvotes: 1284,
    weeklyDownvotes: 14,
    weeklyDeals: 32,
    expiredPenalty: 2,
    fakePenalty: 0,
  },
  {
    name: "Arjun Alerts",
    slug: "arjun-alerts",
    weeklyUpvotes: 1218,
    weeklyDownvotes: 8,
    weeklyDeals: 29,
    expiredPenalty: 0,
    fakePenalty: 1,
  },
  {
    name: "Meera Markdown",
    slug: "meera-markdown",
    weeklyUpvotes: 1070,
    weeklyDownvotes: 10,
    weeklyDeals: 25,
    expiredPenalty: 4,
    fakePenalty: 0,
  },
  {
    name: "DealDost Dev",
    slug: "dealdost-dev",
    weeklyUpvotes: 960,
    weeklyDownvotes: 5,
    weeklyDeals: 22,
    expiredPenalty: 0,
    fakePenalty: 1,
  },
  {
    name: "Priya PriceDrop",
    slug: "priya-pricedrop",
    weeklyUpvotes: 845,
    weeklyDownvotes: 5,
    weeklyDeals: 18,
    expiredPenalty: 5,
    fakePenalty: 0,
  },
  {
    name: "Coupon Kaka",
    slug: "coupon-kaka",
    weeklyUpvotes: 710,
    weeklyDownvotes: 10,
    weeklyDeals: 16,
    expiredPenalty: 2,
    fakePenalty: 0,
  },
  {
    name: "Nisha Notes",
    slug: "nisha-notes",
    weeklyUpvotes: 590,
    weeklyDownvotes: 5,
    weeklyDeals: 13,
    expiredPenalty: 0,
    fakePenalty: 1,
  },
  {
    name: "Bargain Bharat",
    slug: "bargain-bharat",
    weeklyUpvotes: 445,
    weeklyDownvotes: 10,
    weeklyDeals: 10,
    expiredPenalty: 1,
    fakePenalty: 0,
  },
] as const;

function getReputationScore(player: (typeof leaderboardPlayers)[number]) {
  return (
    player.weeklyUpvotes -
    player.weeklyDownvotes -
    player.expiredPenalty * 5 -
    player.fakePenalty * 25
  );
}

export async function seedLeaderboard(prisma: PrismaClient) {
  for (const [index, player] of leaderboardPlayers.entries()) {
    const email = `${player.slug}@seed.savekaro.local`;
    const googleId = `seed_leaderboard_${player.slug}`;
    const reputationScore = getReputationScore(player);

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: player.name,
        googleId,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(player.name)}`,
      },
      create: {
        email,
        name: player.name,
        googleId,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(player.name)}`,
      },
    });

    await prisma.userStats.upsert({
      where: { userId: user.id },
      update: {
        weeklyUpvotes: player.weeklyUpvotes,
        weeklyDownvotes: player.weeklyDownvotes,
        weeklyDeals: player.weeklyDeals,
        expiredPenalty: player.expiredPenalty,
        fakePenalty: player.fakePenalty,
        reputationScore,
        weeklyRank: index + 1,
        lastUpdated: new Date(),
      },
      create: {
        userId: user.id,
        weeklyUpvotes: player.weeklyUpvotes,
        weeklyDownvotes: player.weeklyDownvotes,
        weeklyDeals: player.weeklyDeals,
        expiredPenalty: player.expiredPenalty,
        fakePenalty: player.fakePenalty,
        reputationScore,
        weeklyRank: index + 1,
      },
    });
  }

  return leaderboardPlayers.map((player, index) => ({
    name: player.name,
    rank: index + 1,
    score: getReputationScore(player),
  }));
}

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log("🌱 Seeding leaderboard data...");
    const seededPlayers = await seedLeaderboard(prisma);
    for (const player of seededPlayers) {
      console.log(`Created hunter: ${player.name} (#${player.rank}, ${player.score} pts)`);
    }
    console.log(`✅ Leaderboard populated with ${seededPlayers.length} fake players`);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.main) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
