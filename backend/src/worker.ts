import logger from "./lib/logger";
import prisma from "./lib/prisma";
import { shutdownAnalytics } from "./lib/posthog";
import { signalRedditShutdown } from "./services/reddit/client";
import {
  startQueueWorkers,
  type QueueWorkerHandle,
} from "./services/queues";

let workers: QueueWorkerHandle[] = [];
let shutdownPromise: Promise<void> | null = null;

async function main() {
  if (process.env.USE_QUEUE !== "true") {
    throw new Error("The background worker requires USE_QUEUE=true");
  }

  await prisma.$connect();
  logger.info("Worker database connection established");

  const enableTitleClassifier = Boolean(process.env.GEMINI_API_KEY);
  workers = await startQueueWorkers({ enableTitleClassifier });

  if (!enableTitleClassifier) {
    logger.warn(
      "GEMINI_API_KEY is not configured — title classifier worker not started",
    );
  }

  logger.info(
    { workerCount: workers.length, titleClassifier: enableTitleClassifier },
    "Background workers started",
  );
}

async function shutdown() {
  if (shutdownPromise) return shutdownPromise;

  shutdownPromise = (async () => {
    logger.info("Shutting down background workers...");
    signalRedditShutdown();
    await Promise.allSettled(workers.map((worker) => worker.close()));
    await shutdownAnalytics();
    await prisma.$disconnect();
    logger.info("Background workers stopped");
    process.exit(0);
  })().catch(async (error) => {
    logger.error({ error }, "Background worker shutdown failed");
    await prisma.$disconnect().catch(() => undefined);
    process.exit(1);
  });

  return shutdownPromise;
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main().catch(async (error) => {
  logger.error({ error }, "Failed to start background workers");
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
