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
import {
  buildWatchUrlLabel,
  normalizeWatchedProductUrl,
} from "../lib/price-alert-watch";
import { captureServerEvent } from "../lib/posthog";

const alerts = new Hono();

const MAX_ALERTS_PER_USER = PRICE_ALERT_LIMITS.MAX_ALERTS_PER_USER;

alerts.get("/", requireAuth, async (c) => {
  const userId = c.get("userId")!;

  const userAlerts = await prisma.priceAlert.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  return c.json(successResponse(userAlerts));
});

alerts.post("/", requireAuth, validate(createAlertSchema), async (c) => {
  const userId = c.get("userId")!;
  const data = getValidated<CreateAlertInput>(c);
  const mode = data.mode ?? "KEYWORD";

  const count = await prisma.priceAlert.count({ where: { userId } });
  if (count >= MAX_ALERTS_PER_USER) {
    return c.json(
      errorResponse(
        `You can have at most ${MAX_ALERTS_PER_USER} alerts. Delete one to create a new one.`
      ),
      400,
    );
  }

  const watchUrl = mode === "URL" ? data.watchUrl?.trim() ?? null : null;
  const watchUrlNormalized = watchUrl
    ? normalizeWatchedProductUrl(watchUrl)
    : null;

  if (mode === "URL" && !watchUrlNormalized) {
    return c.json(
      errorResponse("Please enter a specific HTTPS product URL, not a homepage."),
      400,
    );
  }

  if (watchUrlNormalized) {
    const existingWatchAlert = await prisma.priceAlert.findFirst({
      where: {
        userId,
        watchUrlNormalized,
      },
      select: { id: true },
    });

    if (existingWatchAlert) {
      return c.json(
        errorResponse("You are already tracking this product URL."),
        409,
      );
    }
  }

  const alert = await prisma.priceAlert.create({
    data: {
      userId,
      mode,
      keywords:
        mode === "URL"
          ? buildWatchUrlLabel(watchUrl!)
          : data.keywords!.trim(),
      watchUrl,
      watchUrlNormalized,
      maxPrice: data.maxPrice ?? null,
      categoryId: mode === "URL" ? null : (data.categoryId ?? null),
      region: data.region ?? null,
    },
  });

  captureServerEvent(c, "alert:create", {
    alert_id: alert.id,
    alert_mode: mode,
    region: alert.region,
    has_max_price: alert.maxPrice !== null,
    has_category: alert.categoryId !== null,
  });

  return c.json(successResponse(alert), 201);
});

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

  const nextMode = data.mode ?? existing.mode;
  const nextWatchUrl =
    data.watchUrl !== undefined ? data.watchUrl?.trim() ?? null : existing.watchUrl;
  const nextWatchUrlNormalized =
    nextMode === "URL" && nextWatchUrl
      ? normalizeWatchedProductUrl(nextWatchUrl)
      : null;

  if (nextMode === "URL" && !nextWatchUrlNormalized) {
    return c.json(
      errorResponse("Please enter a specific HTTPS product URL, not a homepage."),
      400,
    );
  }

  if (nextWatchUrlNormalized) {
    const conflictingAlert = await prisma.priceAlert.findFirst({
      where: {
        userId,
        id: { not: id },
        watchUrlNormalized: nextWatchUrlNormalized,
      },
      select: { id: true },
    });

    if (conflictingAlert) {
      return c.json(
        errorResponse("You are already tracking this product URL."),
        409,
      );
    }
  }

  const nextKeywords =
    nextMode === "URL"
      ? buildWatchUrlLabel(nextWatchUrl!)
      : data.keywords?.trim() ?? existing.keywords;

  const updated = await prisma.priceAlert.update({
    where: { id },
    data: {
      mode: nextMode,
      keywords: nextKeywords,
      watchUrl: nextMode === "URL" ? nextWatchUrl : null,
      watchUrlNormalized: nextMode === "URL" ? nextWatchUrlNormalized : null,
      maxPrice:
        data.maxPrice !== undefined ? (data.maxPrice ?? null) : undefined,
      categoryId:
        nextMode === "URL"
          ? null
          : data.categoryId !== undefined
            ? (data.categoryId ?? null)
            : undefined,
      region: data.region !== undefined ? (data.region ?? null) : undefined,
    },
  });

  return c.json(successResponse(updated));
});

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

  captureServerEvent(c, "alert:status_change", {
    alert_id: updated.id,
    active: updated.isActive,
    alert_mode: updated.mode,
  });

  return c.json(successResponse(updated));
});

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

  captureServerEvent(c, "alert:delete", {
    alert_id: id,
    alert_mode: existing.mode,
  });

  return c.json(successResponse({ message: "Alert deleted" }));
});

export default alerts;
