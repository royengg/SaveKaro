import { z } from "zod";
import prisma from "../../lib/prisma";
import logger from "../../lib/logger";

const resultSchema = z.object({
  status: z.enum(["ok", "error"]),
  id: z.string().optional(),
  details: z.object({ error: z.string().optional() }).optional(),
});
const MINUTE = 60_000;

async function expoRequest(path: string, body: unknown): Promise<unknown> {
  const response = await fetch(`https://exp.host/--/api/v2/push/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.EXPO_ACCESS_TOKEN
        ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Expo push HTTP ${response.status}`);
  return response.json();
}

async function prepareDeliveries() {
  await prisma.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Notification" WHERE "pushProcessedAt" IS NULL
      ORDER BY "createdAt" LIMIT 100 FOR UPDATE SKIP LOCKED`;
      if (!rows.length) return;
      const notifications = await tx.notification.findMany({
        where: { id: { in: rows.map(({ id }) => id) } },
        include: {
          user: {
            select: {
              preferences: { select: { pushNotifications: true } },
              pushInstallations: {
                where: { disabledAt: null },
                select: { id: true },
              },
            },
          },
        },
      });
      const deliveries = notifications.flatMap((notification) =>
        notification.user.preferences?.pushNotifications &&
        notification.createdAt.getTime() > Date.now() - 24 * 60 * MINUTE
          ? notification.user.pushInstallations.map((installation) => ({
              notificationId: notification.id,
              installationId: installation.id,
            }))
          : [],
      );
      if (deliveries.length)
        await tx.pushDelivery.createMany({
          data: deliveries,
          skipDuplicates: true,
        });
      await tx.notification.updateMany({
        where: { id: { in: rows.map(({ id }) => id) } },
        data: { pushProcessedAt: new Date() },
      });
    },
    { timeout: 15_000 },
  );
}

async function deliverPending() {
  const now = new Date();
  const pending = await prisma.pushDelivery.findMany({
    where: { completedAt: null, nextAttemptAt: { lte: now } },
    take: 50,
    orderBy: { nextAttemptAt: "asc" },
    select: { id: true },
  });
  for (const candidate of pending) {
    // Lease per delivery; multiple workers can run safely. Network retries are at-least-once.
    const claimed = await prisma.pushDelivery.updateMany({
      where: {
        id: candidate.id,
        completedAt: null,
        nextAttemptAt: { lte: now },
      },
      data: {
        nextAttemptAt: new Date(Date.now() + 2 * MINUTE),
        attempts: { increment: 1 },
      },
    });
    if (!claimed.count) continue;
    // Re-read after claiming: account, token and preferences may change while this batch runs.
    const delivery = await prisma.pushDelivery.findUnique({
      where: { id: candidate.id },
      include: {
        notification: {
          include: {
            user: {
              select: { preferences: { select: { pushNotifications: true } } },
            },
          },
        },
        installation: true,
      },
    });
    if (!delivery) continue;
    try {
      if (
        delivery.installation.disabledAt ||
        delivery.installation.userId !== delivery.notification.userId ||
        !delivery.notification.user.preferences?.pushNotifications ||
        delivery.createdAt.getTime() < Date.now() - 24 * 60 * MINUTE
      ) {
        await prisma.pushDelivery.update({
          where: { id: delivery.id },
          data: { completedAt: new Date() },
        });
        continue;
      }
      let result: z.infer<typeof resultSchema> | undefined;
      if (delivery.ticketId) {
        const response = z
          .object({ data: z.record(resultSchema) })
          .parse(
            await expoRequest("getReceipts", { ids: [delivery.ticketId] }),
          );
        result = response.data[delivery.ticketId];
      } else {
        const data = z
          .object({
            dealId: z
              .string()
              .regex(/^[a-zA-Z0-9_-]{1,128}$/)
              .optional(),
          })
          .safeParse(delivery.notification.data);
        const response = z.object({ data: z.array(resultSchema) }).parse(
          await expoRequest("send", [
            {
              to: delivery.installation.expoPushToken,
              title: delivery.notification.title,
              body: delivery.notification.message,
              sound: "default",
              channelId: "deals",
              data: {
                ...(data.success ? data.data : {}),
                notificationId: delivery.notificationId,
              },
            },
          ]),
        );
        result = response.data[0];
        if (!result) throw new Error("Expo returned no push ticket");
      }
      if (result?.status === "error") {
        const code = result.details?.error;
        if (code === "DeviceNotRegistered")
          await prisma.pushInstallation.updateMany({
            where: {
              id: delivery.installationId,
              expoPushToken: delivery.installation.expoPushToken,
            },
            data: { disabledAt: new Date() },
          });
        if (code === "MessageRateExceeded") {
          // A failed receipt means the message needs resending, not more receipt polling.
          if (delivery.ticketId)
            await prisma.pushDelivery.update({
              where: { id: delivery.id },
              data: { ticketId: null },
            });
          throw new Error("Expo push rate limit");
        }
        logger.warn(
          { deliveryId: delivery.id, code },
          "Push delivery rejected",
        );
        await prisma.pushDelivery.update({
          where: { id: delivery.id },
          data: { completedAt: new Date() },
        });
      } else if (delivery.ticketId && result?.status === "ok") {
        await prisma.pushDelivery.update({
          where: { id: delivery.id },
          data: { completedAt: new Date() },
        });
      } else if (!delivery.ticketId && result?.id) {
        await prisma.pushDelivery.update({
          where: { id: delivery.id },
          data: {
            ticketId: result.id,
            nextAttemptAt: new Date(Date.now() + 15 * MINUTE),
          },
        });
      } else if (delivery.ticketId) {
        await prisma.pushDelivery.update({
          where: { id: delivery.id },
          data: { nextAttemptAt: new Date(Date.now() + 15 * MINUTE) },
        });
      } else throw new Error("Expo returned an invalid push ticket");
    } catch (error) {
      logger.warn(
        { error, deliveryId: delivery.id },
        "Push delivery will retry",
      );
      await prisma.pushDelivery.updateMany({
        where: { id: delivery.id },
        data: {
          nextAttemptAt: new Date(
            Date.now() + Math.min(60, 2 ** (delivery.attempts - 1)) * MINUTE,
          ),
          ...(delivery.attempts >= 6 ? { completedAt: new Date() } : {}),
        },
      });
    }
  }
}

export function startMobileMaintenanceWorker(): { close: () => Promise<void> } {
  let active: Promise<void> | null = null;
  let lastCleanup = 0;
  const tick = () => {
    if (active) return;
    active = (async () => {
      if (process.env.EXPO_PUSH_ENABLED === "true") {
        await prepareDeliveries();
        await deliverPending();
      }
      if (Date.now() - lastCleanup > 60 * MINUTE) {
        await prisma.mobileSession.deleteMany({
          where: { expiresAt: { lt: new Date() } },
        });
        await prisma.pushDelivery.deleteMany({
          where: {
            completedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * MINUTE) },
          },
        });
        lastCleanup = Date.now();
      }
    })()
      .catch((error) => logger.error({ error }, "Push worker iteration failed"))
      .finally(() => {
        active = null;
      });
  };
  const timer = setInterval(tick, 30_000);
  tick();
  return {
    close: async () => {
      clearInterval(timer);
      await active;
    },
  };
}
