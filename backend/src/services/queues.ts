import { Queue, Worker, Job } from "bullmq";
import { DealRegion } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import {
  getRedisConnection,
  getRedisWorkerConnection,
} from "../lib/redis";
import logger from "../lib/logger";
import { fetchPostComments, fetchSubredditPosts } from "./reddit/client";
import { parseRedditPosts } from "./reddit/parser";
import { DealManager } from "./deal-manager";
import { GamificationService } from "./gamification";
import prisma from "../lib/prisma";
import { cacheInvalidate } from "../lib/cache";
import {
  BATCH_SIZES,
  REDDIT_THROTTLE,
  SCRAPE_INTERVALS,
  SUBREDDIT_CONFIG,
} from "../config/constants";

export const QUEUE_NAMES = {
  SCRAPE: "reddit-scrape",
  EMAIL: "email-notifications",
  TITLE_CLASSIFIER: "title-classifier",
  GAMIFICATION: "gamification",
  CLICK_TRACKING: "click-tracking",
} as const;

export interface ScrapeJobData {
  subreddit: string;
  region?: DealRegion;
  sort?: "new" | "hot" | "rising";
  limit?: number;
}

export interface EmailJobData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface TitleClassifierJobData {
  batchSize?: number;
  processAll?: boolean;
  oldestFirst?: boolean;
}

export interface GamificationJobData {
  userId: string;
}

export type ClickTrackingJobData =
  | { type: "flush"; batchId: string; batchKey: string }
  | { type: "recovery" };

const CLICK_BATCH_WINDOW_MS = 1000;
const CLICK_BATCH_DELAY_MS = 1500;
const CLICK_BATCH_TTL_SECONDS = 24 * 60 * 60;
const CLICK_BATCH_RECOVERY_INTERVAL_MS = 15_000;
const CLICK_BATCH_LOCK_TTL_MS = 5 * 60 * 1000;
const producerRedis = getRedisConnection();

function assertProducerReady(): void {
  if (producerRedis.status !== "ready") {
    throw new Error("Background queue producer is not ready");
  }
}

export const scrapeQueue = new Queue<ScrapeJobData>(QUEUE_NAMES.SCRAPE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 60000, // 60s, 120s
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 100,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAMES.EMAIL, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 3000,
    },
    removeOnComplete: {
      age: 3600, // 1 hour
      count: 500,
    },
    removeOnFail: {
      age: 24 * 3600,
    },
  },
});

export const titleClassifierQueue = new Queue<TitleClassifierJobData>(
  QUEUE_NAMES.TITLE_CLASSIFIER,
  {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 60000, // 1 minute
      },
      removeOnComplete: {
        age: 24 * 3600,
        count: 50,
      },
      removeOnFail: {
        age: 7 * 24 * 3600,
      },
    },
  },
);

export const gamificationQueue = new Queue<GamificationJobData>(
  QUEUE_NAMES.GAMIFICATION,
  {
    connection: producerRedis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 24 * 3600 },
    },
  },
);

export const clickTrackingQueue = new Queue<ClickTrackingJobData>(
  QUEUE_NAMES.CLICK_TRACKING,
  {
    connection: producerRedis,
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: { age: 3600, count: 2000 },
      removeOnFail: { age: 24 * 3600 },
    },
  },
);

async function saveDeals(deals: any[], region: DealRegion): Promise<number> {
  const result = await DealManager.saveDeals(deals, region);
  return result.savedCount;
}

export function createScrapeWorker() {
  const worker = new Worker<ScrapeJobData>(
    QUEUE_NAMES.SCRAPE,
    async (job: Job<ScrapeJobData>) => {
      const {
        subreddit,
        region = "INDIA",
        sort = "new",
        limit = BATCH_SIZES.REDDIT_POSTS_NEW,
      } = job.data;

      logger.info(
        { subreddit, region, sort, limit, jobId: job.id },
        "Processing scrape job",
      );

      try {
        const posts = await fetchSubredditPosts(subreddit, { sort, limit });
        logger.info({ subreddit, postCount: posts.length }, "Fetched posts");

        const commentFetcher = (postId: string) =>
          fetchPostComments(subreddit, postId, BATCH_SIZES.REDDIT_COMMENTS);
        const deals = await parseRedditPosts(posts, commentFetcher);
        logger.info({ subreddit, dealCount: deals.length }, "Parsed deals");

        const savedCount = await saveDeals(deals, region);
        logger.info(
          { subreddit, region, savedCount, jobId: job.id },
          "Scrape job completed",
        );

        return { savedCount, postCount: posts.length, dealCount: deals.length };
      } catch (error) {
        logger.error(
          { error, subreddit, region, jobId: job.id },
          "Scrape job failed",
        );
        throw error;
      }
    },
    {
      connection: getRedisWorkerConnection(),
      concurrency: REDDIT_THROTTLE.SCRAPE_WORKER_CONCURRENCY,
      limiter: {
        max: 1,
        duration: REDDIT_THROTTLE.REQUEST_GAP_MS,
      },
    },
  );

  worker.on("completed", (job) => {
    logger.info(
      { jobId: job.id, result: job.returnvalue },
      "Scrape job completed",
    );
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, error: err.message, attempts: job?.attemptsMade },
      "Scrape job failed",
    );
  });

  return worker;
}

export function createEmailWorker() {
  const worker = new Worker<EmailJobData>(
    QUEUE_NAMES.EMAIL,
    async (job: Job<EmailJobData>) => {
      const { to, subject, html, text } = job.data;

      logger.info({ to, subject, jobId: job.id }, "Processing email job");

      const { sendEmail } = await import("./notification/email");

      const success = await sendEmail({ to, subject, html, text });

      if (!success) {
        throw new Error("Failed to send email");
      }

      logger.info({ to, subject, jobId: job.id }, "Email sent successfully");
      return { success: true };
    },
    {
      connection: getRedisWorkerConnection(),
      concurrency: 5, // Send up to 5 emails concurrently
      limiter: {
        max: 100,
        duration: 60000, // Max 100 emails per minute (Resend limit)
      },
    },
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Email job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, "Email job failed");
  });

  return worker;
}

export function createGamificationWorker() {
  const worker = new Worker<GamificationJobData>(
    QUEUE_NAMES.GAMIFICATION,
    async (job: Job<GamificationJobData>) => {
      await GamificationService.refreshUser(job.data.userId);
      return { refreshed: true };
    },
    {
      connection: getRedisWorkerConnection(),
      concurrency: 2,
    },
  );

  worker.on("failed", (job, error) => {
    logger.error(
      { jobId: job?.id, userId: job?.data.userId, error },
      "Gamification refresh failed",
    );
  });

  return worker;
}

async function releaseClickBatchLock(
  lockKey: string,
  lockToken: string,
): Promise<void> {
  await getRedisWorkerConnection().eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    1,
    lockKey,
    lockToken,
  );
}

async function flushClickBatch(batchId: string, batchKey: string) {
  const redis = getRedisWorkerConnection();
  const processingKey = `${batchKey}:processing`;
  const lockKey = `${processingKey}:lock`;
  const lockToken = randomUUID();
  const acquired = await redis.set(
    lockKey,
    lockToken,
    "PX",
    CLICK_BATCH_LOCK_TTL_MS,
    "NX",
  );

  if (!acquired) return { locked: true, updatedDeals: 0, clickCount: 0 };

  try {
    if (!(await redis.exists(processingKey))) {
      if (!(await redis.exists(batchKey))) {
        return { updatedDeals: 0, clickCount: 0 };
      }
      await redis.renamenx(batchKey, processingKey);
    }

    const pendingClicks = await redis.hgetall(processingKey);
    const increments = Object.entries(pendingClicks)
      .filter(([dealId]) => dealId !== "__batch_token")
      .map(([dealId, count]) => ({
        dealId,
        count: Number.parseInt(count, 10),
      }))
      .filter(({ count }) => Number.isInteger(count) && count > 0);

    if (increments.length === 0) {
      await redis.del(processingKey);
      return { updatedDeals: 0, clickCount: 0 };
    }

    const batchToken =
      pendingClicks.__batch_token ||
      createHash("sha256")
        .update(JSON.stringify(increments))
        .digest("hex")
        .slice(0, 32);
    const markerKey = `internal:click-batch:${batchToken}`;
    let alreadyApplied = false;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.systemSetting.create({
          data: { key: markerKey, value: "applied" },
        });

        for (const { dealId, count } of increments) {
          await tx.deal.updateMany({
            where: { id: dealId },
            data: { clickCount: { increment: count } },
          });
        }
      });
    } catch (error: unknown) {
      if ((error as { code?: string }).code === "P2002") {
        alreadyApplied = true;
      } else {
        throw error;
      }
    }

    await redis.del(processingKey);
    await Promise.all(
      increments.map(({ dealId }) =>
        cacheInvalidate(`deals:detail:${dealId}`),
      ),
    );
    await prisma.systemSetting.deleteMany({ where: { key: markerKey } });

    return {
      updatedDeals: increments.length,
      clickCount: increments.reduce((total, entry) => total + entry.count, 0),
      alreadyApplied,
    };
  } finally {
    await releaseClickBatchLock(lockKey, lockToken);
  }
}

async function recoverClickBatches() {
  const redis = getRedisWorkerConnection();
  let cursor = "0";
  let recovered = 0;
  const recoveredBatchKeys = new Set<string>();

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      "MATCH",
      "click-tracking:batch:*",
      "COUNT",
      100,
    );
    cursor = nextCursor;

    for (const redisKey of keys) {
      const match = redisKey.match(
        /^click-tracking:batch:(\d+)(?::processing)?$/,
      );
      if (!match) continue;

      const batchKey = `click-tracking:batch:${match[1]}`;
      if (recoveredBatchKeys.has(batchKey)) continue;

      recoveredBatchKeys.add(batchKey);
      await flushClickBatch(match[1], batchKey);
      recovered++;
    }
  } while (cursor !== "0");

  return { recovered };
}

export function createClickTrackingWorker() {
  const worker = new Worker<ClickTrackingJobData>(
    QUEUE_NAMES.CLICK_TRACKING,
    async (job: Job<ClickTrackingJobData>) =>
      job.data.type === "recovery"
        ? recoverClickBatches()
        : flushClickBatch(job.data.batchId, job.data.batchKey),
    {
      connection: getRedisWorkerConnection(),
      concurrency: 1,
    },
  );

  worker.on("failed", (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        batchId:
          job?.data.type === "flush" ? job.data.batchId : undefined,
        error,
      },
      "Click tracking failed",
    );
  });

  return worker;
}

function buildRepeatPattern(intervalMinutes: number, offsetSeed: number): string {
  const normalizedOffset = ((offsetSeed % intervalMinutes) + intervalMinutes) % intervalMinutes;
  const minutes: number[] = [];

  for (let minute = normalizedOffset; minute < 60; minute += intervalMinutes) {
    minutes.push(minute);
  }

  return `${minutes.join(",")} * * * *`;
}

export async function scheduleScrapeJobs() {
  const removeLegacyRepeatableJob = async (
    name: string,
    pattern: string,
    jobId: string,
  ) => {
    try {
      await scrapeQueue.removeRepeatable(name, { pattern }, jobId);
      logger.info(
        { name, pattern, jobId },
        "Removed legacy repeatable scrape job",
      );
    } catch {
      // Job may not exist; safe to ignore.
    }
  };

  const subredditJobs = Object.entries(SUBREDDIT_CONFIG).flatMap(
    ([region, subreddits]) =>
      subreddits.map((subreddit) => ({
        subreddit,
        region: region as DealRegion,
      })),
  );

  for (const [index, { subreddit, region }] of subredditJobs.entries()) {
    const jobSuffix = `${region.toLowerCase()}-${subreddit.toLowerCase()}`;
    const newPattern = buildRepeatPattern(15, index);
    const risingPattern = buildRepeatPattern(30, index * 2 + 5);
    const hotPattern = buildRepeatPattern(60, index * 4 + 11);

    // Cleanup pre-region job IDs from older deployments to prevent duplicate runs.
    await removeLegacyRepeatableJob(
      `scrape-${subreddit}-new`,
      "*/15 * * * *",
      `scrape-${subreddit}-new-repeat`,
    );
    await removeLegacyRepeatableJob(
      `scrape-${subreddit}-rising`,
      "*/30 * * * *",
      `scrape-${subreddit}-rising-repeat`,
    );
    await removeLegacyRepeatableJob(
      `scrape-${subreddit}-hot`,
      "0 * * * *",
      `scrape-${subreddit}-hot-repeat`,
    );
    await removeLegacyRepeatableJob(
      `scrape-${jobSuffix}-new`,
      "*/15 * * * *",
      `scrape-${jobSuffix}-new-repeat`,
    );
    await removeLegacyRepeatableJob(
      `scrape-${jobSuffix}-rising`,
      "*/30 * * * *",
      `scrape-${jobSuffix}-rising-repeat`,
    );
    await removeLegacyRepeatableJob(
      `scrape-${jobSuffix}-hot`,
      "0 * * * *",
      `scrape-${jobSuffix}-hot-repeat`,
    );

    await scrapeQueue.add(
      `scrape-${jobSuffix}-new`,
      { subreddit, region, sort: "new", limit: BATCH_SIZES.REDDIT_POSTS_NEW },
      {
        repeat: {
          pattern: newPattern,
        },
        jobId: `scrape-${jobSuffix}-new-repeat`,
      },
    );

    await scrapeQueue.add(
      `scrape-${jobSuffix}-rising`,
      {
        subreddit,
        region,
        sort: "rising",
        limit: BATCH_SIZES.REDDIT_POSTS_RISING,
      },
      {
        repeat: {
          pattern: risingPattern,
        },
        jobId: `scrape-${jobSuffix}-rising-repeat`,
      },
    );

    await scrapeQueue.add(
      `scrape-${jobSuffix}-hot`,
      { subreddit, region, sort: "hot", limit: BATCH_SIZES.REDDIT_POSTS_HOT },
      {
        repeat: {
          pattern: hotPattern,
        },
        jobId: `scrape-${jobSuffix}-hot-repeat`,
      },
    );
  }

  logger.info({ subredditJobs }, "Scheduled scrape jobs for new/rising/hot");
}

export async function queueEmail(data: EmailJobData) {
  return emailQueue.add("send-email", data);
}

export async function queueScrape(data: ScrapeJobData) {
  return scrapeQueue.add("manual-scrape", data);
}

export function createTitleClassifierWorker() {
  const worker = new Worker<TitleClassifierJobData>(
    QUEUE_NAMES.TITLE_CLASSIFIER,
    async (job: Job<TitleClassifierJobData>) => {
      const {
        batchSize = BATCH_SIZES.TITLE_CLASSIFIER,
        processAll = false,
        oldestFirst = false,
      } = job.data;

      logger.info(
        { batchSize, processAll, oldestFirst, jobId: job.id },
        "Processing title classifier job",
      );

      try {
        const { processUnclassifiedDeals, processAllUnclassifiedDeals } =
          await import("./title-classifier");

        const result = processAll
          ? await processAllUnclassifiedDeals()
          : await processUnclassifiedDeals(batchSize, { oldestFirst });

        logger.info(
          { result, jobId: job.id },
          "Title classifier job completed",
        );

        return result;
      } catch (error) {
        logger.error({ error, jobId: job.id }, "Title classifier job failed");
        throw error;
      }
    },
    {
      connection: getRedisWorkerConnection(),
      concurrency: 1, // Only one classifier job at a time
    },
  );

  worker.on("completed", (job) => {
    logger.info(
      { jobId: job.id, result: job.returnvalue },
      "Title classifier job completed",
    );
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, error: err.message },
      "Title classifier job failed",
    );
  });

  return worker;
}

export async function scheduleTitleClassifierJobs() {
  const removeLegacyRepeatableJob = async (
    name: string,
    pattern: string,
    jobId: string,
    timezone?: string,
  ) => {
    try {
      await titleClassifierQueue.removeRepeatable(
        name,
        {
          pattern,
          ...(timezone ? { tz: timezone } : {}),
        },
        jobId,
      );
      logger.info(
        { name, pattern, jobId },
        "Removed legacy repeatable title classifier job",
      );
    } catch {
      // Job may not exist; safe to ignore.
    }
  };

  await removeLegacyRepeatableJob(
    "nightly-title-classifier",
    "0 20 * * *",
    "nightly-title-classifier-repeat",
  );

  await removeLegacyRepeatableJob(
    "incremental-title-classifier",
    "*/30 * * * *",
    "incremental-title-classifier-repeat",
    "Asia/Kolkata",
  );

  await removeLegacyRepeatableJob(
    "backfill-title-classifier",
    "0 2 * * *",
    "backfill-title-classifier-repeat",
    "Asia/Kolkata",
  );

  await removeLegacyRepeatableJob(
    "daily-title-classifier",
    "10 0 * * *",
    "daily-title-classifier-repeat",
    "Asia/Kolkata",
  );

  await titleClassifierQueue.add(
    "interval-title-classifier",
    {
      processAll: false,
      batchSize: BATCH_SIZES.TITLE_CLASSIFIER,
      oldestFirst: false,
    },
    {
      repeat: {
        pattern: SCRAPE_INTERVALS.TITLE_CLASSIFIER_INTERVAL,
        tz: "Asia/Kolkata",
      },
      jobId: "interval-title-classifier-repeat",
    },
  );

  logger.info(
    {
      schedule: SCRAPE_INTERVALS.TITLE_CLASSIFIER_INTERVAL,
      timezone: "Asia/Kolkata",
      batchSize: BATCH_SIZES.TITLE_CLASSIFIER,
    },
    "Scheduled interval title classifier job",
  );
}

export async function queueTitleClassifier(data: TitleClassifierJobData = {}) {
  return titleClassifierQueue.add("manual-title-classifier", data);
}

export async function queueGamificationRefresh(data: GamificationJobData) {
  assertProducerReady();
  return gamificationQueue.add("refresh-user-gamification", data, {
    delay: 500,
    deduplication: {
      id: data.userId,
      ttl: 500,
      extend: true,
      replace: true,
    },
  });
}

export async function queueDealClick(dealId: string) {
  assertProducerReady();
  const batchId = String(Math.floor(Date.now() / CLICK_BATCH_WINDOW_MS));
  const batchKey = `click-tracking:batch:${batchId}`;
  const redis = producerRedis;
  if (redis.status !== "ready") {
    throw new Error("Click batch Redis connection is not ready");
  }

  let results: Awaited<ReturnType<ReturnType<typeof redis.multi>["exec"]>>;
  try {
    results = await redis
      .multi()
      .hsetnx(batchKey, "__batch_token", randomUUID())
      .hincrby(batchKey, dealId, 1)
      .expire(batchKey, CLICK_BATCH_TTL_SECONDS)
      .exec();
  } catch (error) {
    const unknownStateError = new Error(
      "Click batch write failed with an uncertain outcome",
      { cause: error },
    ) as Error & { code: string };
    unknownStateError.code = "CLICK_QUEUE_WRITE_STATE_UNKNOWN";
    throw unknownStateError;
  }

  const commandError = results?.find(([error]) => error)?.[0];
  if (!results || commandError) {
    const unknownStateError = new Error(
      "Click batch write returned an uncertain result",
      { cause: commandError },
    ) as Error & { code: string };
    unknownStateError.code = "CLICK_QUEUE_WRITE_STATE_UNKNOWN";
    throw unknownStateError;
  }

  void clickTrackingQueue
    .add(
      "flush-deal-clicks",
      { type: "flush", batchId, batchKey },
      {
        delay: CLICK_BATCH_DELAY_MS,
        jobId: `click-batch-${batchId}`,
      },
    )
    .catch((error) => {
      logger.warn(
        { error, batchId },
        "Click batch was recorded but its immediate flush job could not be queued; recovery will retry it",
      );
    });
}

export async function scheduleClickBatchRecovery() {
  await clickTrackingQueue.add(
    "recover-click-batches",
    { type: "recovery" },
    {
      repeat: { every: CLICK_BATCH_RECOVERY_INTERVAL_MS },
      jobId: "click-batch-recovery-repeat",
    },
  );
}

export interface QueueWorkerHandle {
  close(): Promise<void>;
}

export async function startQueueWorkers(options?: {
  enableTitleClassifier?: boolean;
}): Promise<QueueWorkerHandle[]> {
  const enableTitleClassifier = options?.enableTitleClassifier ?? false;
  const workers: QueueWorkerHandle[] = [
    createScrapeWorker(),
    createEmailWorker(),
    createGamificationWorker(),
    createClickTrackingWorker(),
  ];

  if (enableTitleClassifier) {
    workers.push(createTitleClassifierWorker());
  }

  try {
    await scheduleScrapeJobs();
    await scheduleClickBatchRecovery();
    if (enableTitleClassifier) {
      await scheduleTitleClassifierJobs();
    }
    return workers;
  } catch (error) {
    await Promise.allSettled(workers.map((worker) => worker.close()));
    throw error;
  }
}

export default {
  scrapeQueue,
  emailQueue,
  titleClassifierQueue,
  gamificationQueue,
  clickTrackingQueue,
  createScrapeWorker,
  createEmailWorker,
  createTitleClassifierWorker,
  createGamificationWorker,
  createClickTrackingWorker,
  scheduleScrapeJobs,
  scheduleTitleClassifierJobs,
  queueEmail,
  queueScrape,
  queueTitleClassifier,
  queueGamificationRefresh,
  queueDealClick,
  scheduleClickBatchRecovery,
  startQueueWorkers,
};
