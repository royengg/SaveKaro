import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";

import logger from "./lib/logger";
import prisma from "./lib/prisma";
import { authMiddleware } from "./middleware/auth";
import { rateLimiter } from "./middleware/rateLimiter";

// Route imports
import authRoutes from "./routes/auth";
import dealRoutes from "./routes/deals";
import userRoutes from "./routes/users";
import categoryRoutes from "./routes/categories";
import commentRoutes from "./routes/comments";
import notificationRoutes from "./routes/notifications";

const app = new Hono();

// Global middleware
app.use("*", honoLogger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Apply rate limiting to API routes
app.use("/api/*", rateLimiter);

// Apply auth middleware to all API routes
app.use("/api/*", authMiddleware);

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.route("/api/auth", authRoutes);
app.route("/api/deals", dealRoutes);
app.route("/api/users", userRoutes);
app.route("/api/categories", categoryRoutes);
app.route("/api/comments", commentRoutes);
app.route("/api/notifications", notificationRoutes);

// Stats endpoint
app.get("/api/stats", async (c) => {
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

  return c.json({
    success: true,
    data: {
      totalDeals: dealCount,
      totalUsers: userCount,
      categories: categoryStats.map((cat: any) => ({
        name: cat.name,
        slug: cat.slug,
        dealCount: cat._count.deals,
      })),
    },
  });
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "Not found",
    },
    404
  );
});

// Error handler
app.onError((err, c) => {
  logger.error({ error: err }, "Unhandled error");
  return c.json(
    {
      success: false,
      error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    },
    500
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

    // Start job processing based on configuration
    if (USE_QUEUE) {
      // Use BullMQ for job processing (recommended for production)
      const { createScrapeWorker, createEmailWorker, scheduleScrapeJobs } = await import(
        "./services/queues"
      );

      // Create workers
      const scrapeWorker = createScrapeWorker();
      const emailWorker = createEmailWorker();

      // Schedule recurring jobs
      await scheduleScrapeJobs();

      logger.info("Job queue workers started");

      // Store workers for graceful shutdown
      (globalThis as Record<string, unknown>).__workers = [scrapeWorker, emailWorker];
    } else if (process.env.ENABLE_SCRAPER !== "false") {
      // Fallback to simple in-process cron (for development)
      const { startScheduler } = await import("./services/reddit/scheduler");
      startScheduler();
      logger.info("In-process scheduler started (set USE_QUEUE=true for production)");
    }

    logger.info({ port: PORT }, "Server starting");

    Bun.serve({
      port: PORT,
      fetch: app.fetch,
    });

    logger.info({ port: PORT }, "Server running");
  } catch (error) {
    logger.error({ error }, "Failed to start server");
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info("Shutting down...");

  // Close workers if using queue
  const workers = (globalThis as Record<string, unknown>).__workers as
    | { close: () => Promise<void> }[]
    | undefined;
  if (workers) {
    await Promise.all(workers.map((w) => w.close()));
    logger.info("Workers closed");
  }

  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main();

export default app;
