import { Queue, Worker, Job } from "bullmq";
import { DealRegion } from "@prisma/client";
import { getRedisConnection } from "../lib/redis";
import logger from "../lib/logger";
import { fetchPostComments, fetchSubredditPosts } from "./reddit/client";
import { parseRedditPosts } from "./reddit/parser";
import { DealManager } from "./deal-manager";
import {
  BATCH_SIZES,
  REDDIT_THROTTLE,
  SCRAPE_INTERVALS,
  SUBREDDIT_CONFIG,
} from "../config/constants";

// Queue names
export const QUEUE_NAMES = {
  SCRAPE: "reddit-scrape",
  EMAIL: "email-notifications",
  TITLE_CLASSIFIER: "title-classifier",
} as const;

// Job types
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

// Create queues
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

// Helper to save deals to database using centralized DealManager
async function saveDeals(deals: any[], region: DealRegion): Promise<number> {
  const result = await DealManager.saveDeals(deals, region);
  return result.savedCount;
}

// Create scrape worker
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
        throw error; // Re-throw to trigger retry
      }
    },
    {
      connection: getRedisConnection(),
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

// Create email worker
export function createEmailWorker() {
  // Dynamic import to avoid loading Resend if not needed
  const worker = new Worker<EmailJobData>(
    QUEUE_NAMES.EMAIL,
    async (job: Job<EmailJobData>) => {
      const { to, subject, html, text } = job.data;

      logger.info({ to, subject, jobId: job.id }, "Processing email job");

      // Import email service dynamically
      const { sendEmail } = await import("./notification/email");

      const success = await sendEmail({ to, subject, html, text });

      if (!success) {
        throw new Error("Failed to send email");
      }

      logger.info({ to, subject, jobId: job.id }, "Email sent successfully");
      return { success: true };
    },
    {
      connection: getRedisConnection(),
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

function buildRepeatPattern(intervalMinutes: number, offsetSeed: number): string {
  const normalizedOffset = ((offsetSeed % intervalMinutes) + intervalMinutes) % intervalMinutes;
  const minutes: number[] = [];

  for (let minute = normalizedOffset; minute < 60; minute += intervalMinutes) {
    minutes.push(minute);
  }

  return `${minutes.join(",")} * * * *`;
}

// Schedule scrape jobs
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

    // Add repeating job for NEW posts (most frequent - catches fresh deals)
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

    // Add repeating job for RISING posts (catches trending deals)
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

    // Add repeating job for HOT posts (catches popular deals, less frequent)
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

// Helper to queue an email
export async function queueEmail(data: EmailJobData) {
  return emailQueue.add("send-email", data);
}

// Helper to queue an immediate scrape
export async function queueScrape(data: ScrapeJobData) {
  return scrapeQueue.add("manual-scrape", data);
}

// Create title classifier worker
export function createTitleClassifierWorker() {
  const worker = new Worker<TitleClassifierJobData>(
    QUEUE_NAMES.TITLE_CLASSIFIER,
    async (job: Job<TitleClassifierJobData>) => {
      const {
        batchSize = BATCH_SIZES.TITLE_CLASSIFIER_INCREMENTAL,
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
      connection: getRedisConnection(),
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

// Schedule recurring title classifier jobs
export async function scheduleTitleClassifierJobs() {
  const removeLegacyRepeatableJob = async (
    name: string,
    pattern: string,
    jobId: string,
  ) => {
    try {
      await titleClassifierQueue.removeRepeatable(name, { pattern }, jobId);
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

  await titleClassifierQueue.add(
    "incremental-title-classifier",
    {
      processAll: false,
      batchSize: BATCH_SIZES.TITLE_CLASSIFIER_INCREMENTAL,
      oldestFirst: false,
    },
    {
      repeat: {
        pattern: SCRAPE_INTERVALS.TITLE_CLASSIFIER_INCREMENTAL,
        tz: "Asia/Kolkata",
      },
      jobId: "incremental-title-classifier-repeat",
    },
  );

  await titleClassifierQueue.add(
    "backfill-title-classifier",
    {
      processAll: false,
      batchSize: BATCH_SIZES.TITLE_CLASSIFIER_BACKFILL,
      oldestFirst: true,
    },
    {
      repeat: {
        pattern: SCRAPE_INTERVALS.TITLE_CLASSIFIER_BACKFILL,
        tz: "Asia/Kolkata",
      },
      jobId: "backfill-title-classifier-repeat",
    },
  );

  logger.info(
    {
      incrementalBatchSize: BATCH_SIZES.TITLE_CLASSIFIER_INCREMENTAL,
      backfillBatchSize: BATCH_SIZES.TITLE_CLASSIFIER_BACKFILL,
    },
    "Scheduled recurring title classifier jobs",
  );
}

// Helper to manually trigger title classification
export async function queueTitleClassifier(data: TitleClassifierJobData = {}) {
  return titleClassifierQueue.add("manual-title-classifier", data);
}

export default {
  scrapeQueue,
  emailQueue,
  titleClassifierQueue,
  createScrapeWorker,
  createEmailWorker,
  createTitleClassifierWorker,
  scheduleScrapeJobs,
  scheduleTitleClassifierJobs,
  queueEmail,
  queueScrape,
  queueTitleClassifier,
};
