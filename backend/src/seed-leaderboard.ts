import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding leaderboard data...");

  const hunters = [
    { name: "DealMaster", score: 1250 },
    { name: "SavingsQueen", score: 980 },
    { name: "BudgetNinja", score: 875 },
    { name: "CouponKing", score: 750 },
    { name: "ThriftyPro", score: 620 },
    { name: "DiscountDuke", score: 540 },
    { name: "FrugalFox", score: 480 },
    { name: "PennyWise", score: 390 },
    { name: "SaleSniper", score: 280 },
    { name: "BargainBaron", score: 150 },
  ];

  for (let i = 0; i < hunters.length; i++) {
    const hunter = hunters[i];
    const email = `hunter${i + 1}@example.com`;
    const googleId = `google_test_id_${i + 1}`;

    // Create or update user
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: hunter.name,
        googleId,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${hunter.name}`,
      },
    });

    // Create or update stats
    await prisma.userStats.upsert({
      where: { userId: user.id },
      update: {
        reputationScore: hunter.score,
        weeklyUpvotes: Math.floor(hunter.score / 1.5),
        weeklyDeals: Math.floor(hunter.score / 50),
      },
      create: {
        userId: user.id,
        reputationScore: hunter.score,
        weeklyUpvotes: Math.floor(hunter.score / 1.5),
        weeklyDeals: Math.floor(hunter.score / 50),
      },
    });

    console.log(`Created hunter: ${hunter.name} (${hunter.score} pts)`);
  }

  console.log("✅ Leaderboard populated!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
