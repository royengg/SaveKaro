import { Hono } from "hono";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { validate, getValidated } from "../middleware/validate";
import {
  createAlertSchema,
  updateAlertSchema,
  CreateAlertInput,
  UpdateAlertInput,
} from "../schemas";

const alerts = new Hono();

// Max alerts per user
const MAX_ALERTS_PER_USER = 10;

// Get user's alerts
alerts.get("/", requireAuth, async (c) => {
  const userId = c.get("userId")!;

  const userAlerts = await prisma.priceAlert.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return c.json({ success: true, data: userAlerts });
});

// Create a new alert
alerts.post("/", requireAuth, validate(createAlertSchema), async (c) => {
  const userId = c.get("userId")!;
  const data = getValidated<CreateAlertInput>(c);

  // Check limit
  const count = await prisma.priceAlert.count({ where: { userId } });
  if (count >= MAX_ALERTS_PER_USER) {
    return c.json(
      {
        success: false,
        error: `You can have at most ${MAX_ALERTS_PER_USER} alerts. Delete one to create a new one.`,
      },
      400,
    );
  }

  const alert = await prisma.priceAlert.create({
    data: {
      userId,
      keywords: data.keywords.trim(),
      maxPrice: data.maxPrice ?? null,
      categoryId: data.categoryId ?? null,
      region: data.region ?? null,
    },
  });

  return c.json({ success: true, data: alert }, 201);
});

// Update an alert
alerts.put("/:id", requireAuth, validate(updateAlertSchema), async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const data = getValidated<UpdateAlertInput>(c);

  const existing = await prisma.priceAlert.findUnique({ where: { id } });

  if (!existing) {
    return c.json({ success: false, error: "Alert not found" }, 404);
  }

  if (existing.userId !== userId) {
    return c.json({ success: false, error: "Not authorized" }, 403);
  }

  const updated = await prisma.priceAlert.update({
    where: { id },
    data: {
      keywords: data.keywords?.trim(),
      maxPrice:
        data.maxPrice !== undefined ? (data.maxPrice ?? null) : undefined,
      categoryId:
        data.categoryId !== undefined ? (data.categoryId ?? null) : undefined,
      region: data.region !== undefined ? (data.region ?? null) : undefined,
    },
  });

  return c.json({ success: true, data: updated });
});

// Toggle alert active/inactive
alerts.put("/:id/toggle", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");

  const existing = await prisma.priceAlert.findUnique({ where: { id } });

  if (!existing) {
    return c.json({ success: false, error: "Alert not found" }, 404);
  }

  if (existing.userId !== userId) {
    return c.json({ success: false, error: "Not authorized" }, 403);
  }

  const updated = await prisma.priceAlert.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  return c.json({ success: true, data: updated });
});

// Delete an alert
alerts.delete("/:id", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");

  const existing = await prisma.priceAlert.findUnique({ where: { id } });

  if (!existing) {
    return c.json({ success: false, error: "Alert not found" }, 404);
  }

  if (existing.userId !== userId) {
    return c.json({ success: false, error: "Not authorized" }, 403);
  }

  await prisma.priceAlert.delete({ where: { id } });

  return c.json({ success: true, message: "Alert deleted" });
});

export default alerts;
