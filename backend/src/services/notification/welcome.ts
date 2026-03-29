import type { PrismaClient, User } from "@prisma/client";

export const WELCOME_NOTIFICATION_MESSAGE = "Thank you for joining SaveKaro.";

function getWelcomeDisplayName(user: Pick<User, "name" | "email">) {
  const name = user.name?.trim();
  if (name) {
    return name;
  }

  const emailHandle = user.email.split("@")[0]?.trim();
  return emailHandle || "there";
}

export function getWelcomeNotificationTitle(user: Pick<User, "name" | "email">) {
  return `Welcome ${getWelcomeDisplayName(user)}`;
}

export async function ensureWelcomeNotification(
  prisma: PrismaClient,
  user: Pick<User, "id" | "name" | "email">,
) {
  const existingNotification = await prisma.notification.findFirst({
    where: {
      userId: user.id,
      type: "SYSTEM",
      message: WELCOME_NOTIFICATION_MESSAGE,
    },
    select: { id: true },
  });

  if (existingNotification) {
    return false;
  }

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "SYSTEM",
      title: getWelcomeNotificationTitle(user),
      message: WELCOME_NOTIFICATION_MESSAGE,
      data: {
        kind: "welcome",
      },
    },
  });

  return true;
}
