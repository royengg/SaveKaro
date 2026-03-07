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
import { successResponse, errorResponse, notFoundResponse } from "../lib/responses";
import { validateOwnership } from "../lib/ownership";
import { PRICE_ALERT_LIMITS } from "../config/constants";

const alerts = new Hono();

// Max alerts per user from constants
const MAX_ALERTS_PER_USER = PRICE_ALERT_LIMITS.MAX_ALERTS_PER_USER;

// Get user's alerts
alerts.get("/", requireAuth, async (c) => {
  const userId = c.get("userId")!;

  const userAlerts = await prisma.priceAlert.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return c.json(successResponse(userAlerts));
});

// Create a new alert
alerts.post("/", requireAuth, validate(createAlertSchema), async (c) => {
  const userId = c.get("userId")!;
  const data = getValidated<CreateAlertInput>(c);

  // Check limit
  const count = await prisma.priceAlert.count({ where: { userId } });
  if (count >= MAX_ALERTS_PER_USER) {
    return c.json(
      errorResponse(
        `You can have at most ${MAX_ALERTS_PER_USER} alerts. Delete one to create a new one.`
      ),
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

  return c.json(successResponse(alert), 201);
});

// Update an alert
alerts.put("/:id", requireAuth, validate(updateAlertSchema), async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");
  const data = getValidated<UpdateAlertInput>(c);

  const existing = await prisma.priceAlert.findUnique({ where: { id } });

  if (!existing) {
    return c.json(notFoundResponse("Alert"), 404);
  }

  const ownershipError = validateOwnership(existing.userId, userId);
  if (ownershipError) {
    return c.json(ownershipError, 403);
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

  return c.json(successResponse(updated));
});

// Toggle alert active/inactive
alerts.put("/:id/toggle", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");

  const existing = await prisma.priceAlert.findUnique({ where: { id } });

  if (!existing) {
    return c.json(notFoundResponse("Alert"), 404);
  }

  const ownershipError = validateOwnership(existing.userId, userId);
  if (ownershipError) {
    return c.json(ownershipError, 403);
  }

  const updated = await prisma.priceAlert.update({
    where: { id },
    data: { isActive: !existing.isActive },
  });

  return c.json(successResponse(updated));
});

// Delete an alert
alerts.delete("/:id", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const id = c.req.param("id");

  const existing = await prisma.priceAlert.findUnique({ where: { id } });

  if (!existing) {
    return c.json(notFoundResponse("Alert"), 404);
  }

  const ownershipError = validateOwnership(existing.userId, userId);
  if (ownershipError) {
    return c.json(ownershipError, 403);
  }

  await prisma.priceAlert.delete({ where: { id } });

  return c.json(successResponse({ message: "Alert deleted" }));
});

export default alerts;
