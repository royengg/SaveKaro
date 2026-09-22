import { Hono } from "hono";
import { cors } from "hono/cors";
import { compress } from "hono/compress";
import { logger as honoLogger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import logger from "./lib/logger";
import prisma from "./lib/prisma";
import { isRedisHealthy } from "./lib/redis";
import { cacheGet, cacheSet } from "./lib/cache";
import { authMiddleware } from "./middleware/auth";
import { rateLimiter, getRateLimiterStatus } from "./middleware/rate-limiter";
import { requestId } from "./middleware/request-id";
import { successResponse } from "./lib/responses";
import { CACHE_TTL } from "./config/constants";
import { setPublicCacheHeaders } from "./lib/http-cache";

import authRoutes from "./routes/auth";
import dealRoutes from "./routes/deals";
import userRoutes from "./routes/users";
import categoryRoutes from "./routes/categories";
import commentRoutes from "./routes/comments";
import notificationRoutes from "./routes/notifications";
import gamificationRoutes from "./routes/gamification";
import alertRoutes from "./routes/alerts";
import dealPreviewRoutes from "./routes/deal-preview";

import { startScheduler, stopScheduler } from "./services/reddit/scheduler";
import { stopTitleClassifierScheduler } from "./services/title-classifier";
import { startTitleClassifierScheduler } from "./services/title-classifier";
import { signalRedditShutdown } from "./services/reddit/client";
import { captureServerException, shutdownAnalytics } from "./lib/posthog";

const app = new Hono();
let shutdownPromise: Promise<void> | null = null;

app.use("*", requestId);
app.use("*", honoLogger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = [
        process.env.FRONTEND_URL,
        "https://savekaro.online",
        "http://localhost:5173",
      ].filter(Boolean);
      if (!origin) return process.env.FRONTEND_URL || "https://savekaro.online";
      if (allowed.includes(origin)) return origin;
      return process.env.FRONTEND_URL || "https://savekaro.online";
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "X-SaveKaro-Analytics-Consent",
      "X-PostHog-Distinct-Id",
      "X-PostHog-Session-Id",
      "X-PostHog-Window-Id",
    ],
    exposeHeaders: ["Set-Cookie", "X-Request-Id"],
    maxAge: 24 * 60 * 60,
  }),
);

function hasDedicatedRateLimiter(method: string, path: string): boolean {
  if (method === "GET") {
    return path === "/api/auth/google" || path === "/api/auth/google/callback";
  }

  if (method !== "POST") return false;
  return (
    path === "/api/auth/token" ||
    path === "/api/deals" ||
    path === "/api/deals/" ||
    /^\/api\/comments\/deal\/[^/]+\/?$/.test(path) ||
    /^\/api\/deals\/[^/]+\/click\/?$/.test(path)
  );
}

app.use("/api/*", async (c, next) => {
  if (hasDedicatedRateLimiter(c.req.method, c.req.path)) {
    await next();
    return;
  }
  return rateLimiter(c, next);
});

app.use(
  "/api/*",
  compress({
    threshold: 1024,
  }),
);

app.use("/api/*", authMiddleware);

app.get("/health", async (c) => {
  const checks: Record<string, string> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  if (process.env.USE_QUEUE === "true") {
    checks.redis = (await isRedisHealthy()) ? "ok" : "error";
  }

  const allHealthy = Object.values(checks).every((v) => v === "ok");

  return c.json(
    {
      status: allHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      rateLimiter: getRateLimiterStatus(),
    },
    allHealthy ? 200 : 503,
  );
});

app.route("/", dealPreviewRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/deals", dealRoutes);
app.route("/api/users", userRoutes);
app.route("/api/categories", categoryRoutes);
app.route("/api/comments", commentRoutes);
app.route("/api/notifications", notificationRoutes);
app.route("/api/gamification", gamificationRoutes);
app.route("/api/alerts", alertRoutes);

app.get("/api/stats", async (c) => {
  setPublicCacheHeaders(c, {
    maxAge: CACHE_TTL.STATS,
    sMaxAge: CACHE_TTL.STATS,
    staleWhileRevalidate: CACHE_TTL.STATS,
    staleIfError: CACHE_TTL.STATS * 10,
  });

  const cacheKey = "stats:global";
  const cached = await cacheGet<any>(cacheKey);
  if (cached) return c.json(cached);

  const [dealCount, userCount, categoryStats] = await Promise.all([
    prisma.deal.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.category.findMany({
      include: {
        _count: {
          select: { deals: { where: { isActive: true } } },
        },
      },
    }),
  ]);

  const response = successResponse({
    totalDeals: dealCount,
    totalUsers: userCount,
    categories: categoryStats.map((cat: any) => ({
      name: cat.name,
      slug: cat.slug,
      dealCount: cat._count.deals,
    })),
  });

  await cacheSet(cacheKey, response, CACHE_TTL.STATS);
  return c.json(response);
});

app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "Not found",
    },
    404,
  );
});

app.onError((err, c) => {
  logger.error({ error: err }, "Unhandled error");
  captureServerException(c, err);
  return c.json(
    {
      success: false,
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
    },
    500,
  );
});

const PORT = parseInt(process.env.PORT || "3001");
const USE_QUEUE = process.env.USE_QUEUE === "true";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const RUN_WORKERS_IN_API = process.env.RUN_WORKERS_IN_API !== "false";
let inlineWorkers: { close: () => Promise<void> }[] = [];

async function main() {
  try {
    await prisma.$connect();
    logger.info("Database connected");

    if (process.env.SKIP_BOOTSTRAP !== "true") {
      const { ensureDefaultCategories } = await import("./services/bootstrap");
      await ensureDefaultCategories();
    }

    if (USE_QUEUE && (!IS_PRODUCTION || RUN_WORKERS_IN_API)) {
      const { startQueueWorkers } = await import("./services/queues");
      inlineWorkers = await startQueueWorkers({
        enableTitleClassifier: Boolean(process.env.GEMINI_API_KEY),
      });
      logger.info("Queue workers started in the API process");
    } else if (USE_QUEUE) {
      logger.info(
        "API queue producers ready; background workers run in the dedicated worker process",
      );
    } else if (IS_PRODUCTION) {
      logger.warn(
        "USE_QUEUE is not set to true — rate limiters, auth codes, and revoked tokens will use in-memory storage (not shared across instances)",
      );
      if (process.env.ENABLE_SCRAPER !== "false") {
        startScheduler();
        logger.info(
          "In-process scheduler started; use the dedicated queue worker for production isolation",
        );
      }
      if (process.env.GEMINI_API_KEY) startTitleClassifierScheduler();
    } else {
      if (process.env.ENABLE_SCRAPER !== "false") {
        startScheduler();
        logger.info(
          "In-process scheduler started (set USE_QUEUE=true for production)",
        );
      }
      if (process.env.GEMINI_API_KEY) startTitleClassifierScheduler();
    }

    logger.info({ port: PORT }, "Server starting");

    Bun.serve({
      hostname: process.env.HOST || "0.0.0.0",
      port: PORT,
      fetch: app.fetch,
      maxRequestBodySize: 1_000_000,
    });

    logger.info({ port: PORT }, "Server running");
  } catch (error) {
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  }
}

async function shutdown() {
  if (shutdownPromise) {
    return shutdownPromise;
  }

  shutdownPromise = (async () => {
    logger.info("Shutting down...");
    signalRedditShutdown();

    if (!USE_QUEUE) {
      stopScheduler();
    }

    if (inlineWorkers.length > 0) {
      await Promise.all(inlineWorkers.map((worker) => worker.close()));
      logger.info("Workers closed");
    }

    if (process.env.GEMINI_API_KEY && !USE_QUEUE) {
      stopTitleClassifierScheduler();
    }

    await shutdownAnalytics();
    await prisma.$disconnect();
    process.exit(0);
  })().catch(async (error) => {
    logger.error({ error }, "Shutdown failed");
    await shutdownAnalytics().catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(1);
  });

  return shutdownPromise;
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main();
