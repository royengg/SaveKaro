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
import { rateLimiter } from "./middleware/rate-limiter";
import { requestId } from "./middleware/request-id";
import { successResponse } from "./lib/responses";
import { CACHE_TTL } from "./config/constants";
import { setPublicCacheHeaders } from "./lib/http-cache";

// Route imports
import authRoutes from "./routes/auth";
import dealRoutes from "./routes/deals";
import userRoutes from "./routes/users";
import categoryRoutes from "./routes/categories";
import commentRoutes from "./routes/comments";
import notificationRoutes from "./routes/notifications";
import gamificationRoutes from "./routes/gamification";
import alertRoutes from "./routes/alerts";
import dealPreviewRoutes from "./routes/deal-preview";

import {
  createScrapeWorker,
  createEmailWorker,
  createTitleClassifierWorker,
  scheduleScrapeJobs,
} from "./services/queues";

import { scheduleTitleClassifierJobs } from "./services/queues";
import { startScheduler, stopScheduler } from "./services/reddit/scheduler";
import { stopTitleClassifierScheduler } from "./services/title-classifier";
import { startTitleClassifierScheduler } from "./services/title-classifier";
import { signalRedditShutdown } from "./services/reddit/client";

const app = new Hono();
let shutdownPromise: Promise<void> | null = null;

// Global middleware
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
      // Allow requests with no origin (e.g. server-to-server, health checks)
      if (!origin) return process.env.FRONTEND_URL || "https://savekaro.online";
      // Check if the request origin is in the allowed list
      if (allowed.includes(origin)) return origin;
      // Default to FRONTEND_URL
      return process.env.FRONTEND_URL || "https://savekaro.online";
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    exposeHeaders: ["Set-Cookie", "X-Request-Id"],
  }),
);

// Apply rate limiting to API routes
app.use("/api/*", rateLimiter);

// Compress API responses to reduce payload transfer cost on slower networks.
app.use(
  "/api/*",
  compress({
    threshold: 1024,
  }),
);

// Apply auth middleware to all API routes
app.use("/api/*", authMiddleware);

// Health check — verifies DB and Redis connectivity
app.get("/health", async (c) => {
  const checks: Record<string, string> = {};

  // Check Postgres
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  // Check Redis (only if queues are enabled)
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
    },
    allHealthy ? 200 : 503,
  );
});

// API Routes
app.route("/", dealPreviewRoutes);
app.route("/api/auth", authRoutes);
app.route("/api/deals", dealRoutes);
app.route("/api/users", userRoutes);
app.route("/api/categories", categoryRoutes);
app.route("/api/comments", commentRoutes);
app.route("/api/notifications", notificationRoutes);
app.route("/api/gamification", gamificationRoutes);
app.route("/api/alerts", alertRoutes);

// Stats endpoint (cached for 60s)
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

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "Not found",
    },
    404,
  );
});

// Error handler
app.onError((err, c) => {
  logger.error({ error: err }, "Unhandled error");
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

// Start server
const PORT = parseInt(process.env.PORT || "3001");
const USE_QUEUE = process.env.USE_QUEUE === "true";

async function main() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info("Database connected");

    // Bootstrap: Ensure critical data exists
    const { ensureDefaultCategories } = await import("./services/bootstrap");
    await ensureDefaultCategories();

    // Start job processing based on configuration
    if (USE_QUEUE) {
      // Use BullMQ for job processing (recommended for production)
      // Create workers
      const scrapeWorker = createScrapeWorker();
      const emailWorker = createEmailWorker();
      const titleClassifierWorker = process.env.GEMINI_API_KEY
        ? createTitleClassifierWorker()
        : null;

      // Schedule recurring jobs
      await scheduleScrapeJobs();
      if (titleClassifierWorker) {
        await scheduleTitleClassifierJobs();
      } else {
        logger.warn(
          "GEMINI_API_KEY is not configured — title classifier worker not started",
        );
      }

      logger.info("Job queue workers started");

      // Store workers for graceful shutdown
      (globalThis as Record<string, unknown>).__workers = [
        scrapeWorker,
        emailWorker,
        ...(titleClassifierWorker ? [titleClassifierWorker] : []),
      ];
    } else if (process.env.NODE_ENV === "production") {
      logger.warn(
        "USE_QUEUE is not set to true — rate limiters, auth codes, and revoked tokens will use in-memory storage (not shared across instances)",
      );
      if (process.env.ENABLE_SCRAPER !== "false") {
        startScheduler();
        logger.info(
          "In-process scheduler started (set USE_QUEUE=true for full production mode)",
        );
      }
      if (process.env.GEMINI_API_KEY) {
        startTitleClassifierScheduler();
      }
    } else if (process.env.ENABLE_SCRAPER !== "false") {
      // Development fallback
      startScheduler();
      logger.info(
        "In-process scheduler started (set USE_QUEUE=true for production)",
      );
      if (process.env.GEMINI_API_KEY) {
        startTitleClassifierScheduler();
      }
    } else if (process.env.GEMINI_API_KEY) {
      startTitleClassifierScheduler();
    }

    logger.info({ port: PORT }, "Server starting");

    Bun.serve({
      port: PORT,
      fetch: app.fetch,
      maxRequestBodySize: 1_000_000, // 1MB body size limit
    });

    logger.info({ port: PORT }, "Server running");
  } catch (error) {
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  }
}

// Graceful shutdown
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

  // Close workers if using queue
  const workers = (globalThis as Record<string, unknown>).__workers as
    | { close: () => Promise<void> }[]
    | undefined;
  if (workers) {
    await Promise.all(workers.map((w) => w.close()));
    logger.info("Workers closed");
  }

  if (process.env.GEMINI_API_KEY && !USE_QUEUE) {
    stopTitleClassifierScheduler();
  }

  await prisma.$disconnect();
  process.exit(0);
  })().catch(async (error) => {
    logger.error({ error }, "Shutdown failed");
    await prisma.$disconnect().catch(() => undefined);
    process.exit(1);
  });

  return shutdownPromise;
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main();
// export default app; // Removed to prevent Bun from automatically starting a second server instance in addition to the manual Bun.serve() in main()
