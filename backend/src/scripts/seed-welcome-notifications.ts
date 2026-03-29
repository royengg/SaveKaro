import { PrismaClient } from "@prisma/client";
import { ensureWelcomeNotification } from "../services/notification/welcome";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  let createdCount = 0;

  for (const user of users) {
    const created = await ensureWelcomeNotification(prisma, user);
    if (created) {
      createdCount += 1;
    }
  }

  console.log(
    `Created ${createdCount} welcome notifications across ${users.length} users.`,
  );
}

main()
  .catch((error) => {
    console.error("Failed to seed welcome notifications:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
