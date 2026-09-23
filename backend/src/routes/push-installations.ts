import { Hono } from "hono";
import { z } from "zod";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const pushInstallations = new Hono();
const registrationSchema = z.object({
  expoPushToken: z
    .string()
    .max(256)
    .regex(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/),
  deviceId: z.string().uuid(),
  platform: z.enum(["android", "ios"]),
  appVersion: z.string().max(64).optional(),
});
pushInstallations.use("*", requireAuth);

pushInstallations.put("/", async (c) => {
  const parsed = registrationSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success)
    return c.json({ success: false, error: "Invalid push registration" }, 400);
  const userId = c.get("user")!.id;
  const { expoPushToken, deviceId, platform, appVersion } = parsed.data;
  await prisma.$transaction(async (tx) => {
    // Serialize registrations for the same physical installation, including account switches.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${deviceId}, 1))`;
    // A token belongs to one current account; switching accounts removes old ownership.
    await tx.pushInstallation.deleteMany({
      where: {
        OR: [{ expoPushToken }, { deviceId }],
        NOT: { userId, deviceId },
      },
    });
    const existing = await tx.pushInstallation.findUnique({
      where: { userId_deviceId: { userId, deviceId } },
      select: { id: true, expoPushToken: true },
    });
    if (existing && existing.expoPushToken !== expoPushToken) {
      // Receipts and pending deliveries belong to the old token, not its replacement.
      await tx.pushDelivery.deleteMany({
        where: { installationId: existing.id },
      });
    }
    await tx.pushInstallation.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      create: { userId, expoPushToken, deviceId, platform, appVersion },
      update: {
        expoPushToken,
        platform,
        appVersion,
        lastSeenAt: new Date(),
        disabledAt: null,
      },
    });
  });
  return c.json({ success: true, data: { registered: true } });
});

pushInstallations.delete("/:deviceId", async (c) => {
  const deviceId = z.string().uuid().safeParse(c.req.param("deviceId"));
  if (!deviceId.success)
    return c.json({ success: false, error: "Invalid device ID" }, 400);
  await prisma.pushInstallation.deleteMany({
    where: { userId: c.get("user")!.id, deviceId: deviceId.data },
  });
  return c.json({ success: true, data: { registered: false } });
});

export default pushInstallations;
