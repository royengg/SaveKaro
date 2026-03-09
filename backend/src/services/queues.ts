import { Queue, Worker, Job } from "bullmq";
import { getRedisConnection } from "../lib/redis";
import logger from "../lib/logger";
import prisma from "../lib/prisma";
import { fetchPostComments, fetchSubredditPosts } from "./reddit/client";
import { parseRedditPosts } from "./reddit/parser";
import { DealManager } from "./deal-manager";
import { BATCH_SIZES } from "../config/constants";

// Queue names
export const QUEUE_NAMES = {
  SCRAPE: "reddit-scrape",
  EMAIL: "email-notifications",
  TITLE_CLASSIFIER: "title-classifier",
} as const;

// Job types
export interface ScrapeJobData {
  subreddit: string;
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
}

// Create queues
export const scrapeQueue = new Queue<ScrapeJobData>(QUEUE_NAMES.SCRAPE, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000, // 5s, 10s, 20s
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
async function saveDeals(deals: any[]): Promise<number> {
  const result = await DealManager.saveDeals(deals, "INDIA"); // Default to INDIA for queue processing
  return result.savedCount;
}

// Create scrape worker
export function createScrapeWorker() {
  const worker = new Worker<ScrapeJobData>(
    QUEUE_NAMES.SCRAPE,
    async (job: Job<ScrapeJobData>) => {
      const { subreddit, sort = "new", limit = BATCH_SIZES.REDDIT_POSTS_NEW } = job.data;

      logger.info(
        { subreddit, sort, limit, jobId: job.id },
        "Processing scrape job",
      );

      try {
        const posts = await fetchSubredditPosts(subreddit, { sort, limit });
        logger.info({ subreddit, postCount: posts.length }, "Fetched posts");

        const commentFetcher = (postId: string) =>
          fetchPostComments(subreddit, postId, BATCH_SIZES.REDDIT_COMMENTS);
        const deals = await parseRedditPosts(posts, commentFetcher);
        logger.info({ subreddit, dealCount: deals.length }, "Parsed deals");

        const savedCount = await saveDeals(deals);
        logger.info(
          { subreddit, savedCount, jobId: job.id },
          "Scrape job completed",
        );

        return { savedCount, postCount: posts.length, dealCount: deals.length };
      } catch (error) {
        logger.error({ error, subreddit, jobId: job.id }, "Scrape job failed");
        throw error; // Re-throw to trigger retry
      }
    },
    {
      connection: getRedisConnection(),
      concurrency: 2, // Process 2 jobs at a time
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

// Schedule scrape jobs
export async function scheduleScrapeJobs() {
  const subreddits = ["dealsforindia"];

  for (const subreddit of subreddits) {
    // Add repeating job for NEW posts (most frequent - catches fresh deals)
    await scrapeQueue.add(
      `scrape-${subreddit}-new`,
      { subreddit, sort: "new", limit: BATCH_SIZES.REDDIT_POSTS_NEW },
      {
        repeat: {
          pattern: "*/15 * * * *", // Every 15 minutes
        },
        jobId: `scrape-${subreddit}-new-repeat`,
      },
    );

    // Add repeating job for RISING posts (catches trending deals)
    await scrapeQueue.add(
      `scrape-${subreddit}-rising`,
      { subreddit, sort: "rising", limit: BATCH_SIZES.REDDIT_POSTS_RISING },
      {
        repeat: {
          pattern: "*/30 * * * *", // Every 30 minutes
        },
        jobId: `scrape-${subreddit}-rising-repeat`,
      },
    );

    // Add repeating job for HOT posts (catches popular deals, less frequent)
    await scrapeQueue.add(
      `scrape-${subreddit}-hot`,
      { subreddit, sort: "hot", limit: BATCH_SIZES.REDDIT_POSTS_HOT },
      {
        repeat: {
          pattern: "0 * * * *", // Every hour
        },
        jobId: `scrape-${subreddit}-hot-repeat`,
      },
    );
  }

  logger.info({ subreddits }, "Scheduled scrape jobs for new/rising/hot");
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
      const { batchSize = 20, processAll = true } = job.data;

      logger.info(
        { batchSize, processAll, jobId: job.id },
        "Processing title classifier job",
      );

      try {
        const { processUnclassifiedDeals, processAllUnclassifiedDeals } =
          await import("./title-classifier");

        const result = processAll
          ? await processAllUnclassifiedDeals()
          : await processUnclassifiedDeals(batchSize);

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

// Schedule nightly title classifier job
export async function scheduleTitleClassifierJob() {
  await titleClassifierQueue.add(
    "nightly-title-classifier",
    { processAll: true },
    {
      repeat: {
        pattern: "0 20 * * *", // 2:00 AM IST (20:30 UTC previous day)
      },
      jobId: "nightly-title-classifier-repeat",
    },
  );

  logger.info("Scheduled nightly title classifier job at 2:00 AM IST");
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
  scheduleTitleClassifierJob,
  queueEmail,
  queueScrape,
  queueTitleClassifier,
};
