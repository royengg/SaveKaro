import { Queue, Worker, Job } from "bullmq";
import { redisConnection } from "../lib/redis";
import logger from "../lib/logger";
import prisma from "../lib/prisma";
import { fetchSubredditPosts } from "./reddit/client";
import { parseRedditPosts, ParsedDeal } from "./reddit/parser";

// Queue names
export const QUEUE_NAMES = {
  SCRAPE: "reddit-scrape",
  EMAIL: "email-notifications",
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

// Create queues
export const scrapeQueue = new Queue<ScrapeJobData>(QUEUE_NAMES.SCRAPE, {
  connection: redisConnection,
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
  connection: redisConnection,
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

// Helper to save deals to database
async function saveDeals(deals: ParsedDeal[]): Promise<number> {
  let savedCount = 0;

  for (const deal of deals) {
    try {
      let category = await prisma.category.findUnique({
        where: { slug: deal.categorySlug },
      });

      if (!category) {
        category = await prisma.category.findUnique({
          where: { slug: "other" },
        });
      }

      if (!category) continue;

      await prisma.deal.upsert({
        where: { redditPostId: deal.redditPostId },
        update: {
          title: deal.title,
          description: deal.description,
          redditScore: deal.redditScore,
        },
        create: {
          title: deal.title,
          description: deal.description,
          originalPrice: deal.originalPrice,
          dealPrice: deal.dealPrice,
          discountPercent: deal.discountPercent,
          productUrl: deal.productUrl,
          imageUrl: deal.imageUrl,
          store: deal.store,
          source: "REDDIT",
          redditPostId: deal.redditPostId,
          redditScore: deal.redditScore,
          categoryId: category.id,
        },
      });

      // Track price history
      if (deal.dealPrice) {
        const existingDeal = await prisma.deal.findUnique({
          where: { redditPostId: deal.redditPostId },
          select: { id: true },
        });

        if (existingDeal) {
          const lastPrice = await prisma.priceHistory.findFirst({
            where: { dealId: existingDeal.id },
            orderBy: { createdAt: "desc" },
          });

          if (!lastPrice || Number(lastPrice.price) !== deal.dealPrice) {
            await prisma.priceHistory.create({
              data: {
                dealId: existingDeal.id,
                price: deal.dealPrice,
                source: "reddit_scrape",
              },
            });
          }
        }
      }

      savedCount++;
    } catch (error) {
      if (error instanceof Error && !error.message.includes("Unique constraint")) {
        logger.error({ error, deal: deal.title }, "Failed to save deal");
      }
    }
  }

  return savedCount;
}

// Create scrape worker
export function createScrapeWorker() {
  const worker = new Worker<ScrapeJobData>(
    QUEUE_NAMES.SCRAPE,
    async (job: Job<ScrapeJobData>) => {
      const { subreddit, sort = "new", limit = 50 } = job.data;

      logger.info({ subreddit, sort, limit, jobId: job.id }, "Processing scrape job");

      try {
        const posts = await fetchSubredditPosts(subreddit, { sort, limit });
        logger.info({ subreddit, postCount: posts.length }, "Fetched posts");

        const deals = parseRedditPosts(posts);
        logger.info({ subreddit, dealCount: deals.length }, "Parsed deals");

        const savedCount = await saveDeals(deals);
        logger.info({ subreddit, savedCount, jobId: job.id }, "Scrape job completed");

        return { savedCount, postCount: posts.length, dealCount: deals.length };
      } catch (error) {
        logger.error({ error, subreddit, jobId: job.id }, "Scrape job failed");
        throw error; // Re-throw to trigger retry
      }
    },
    {
      connection: redisConnection,
      concurrency: 2, // Process 2 jobs at a time
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id, result: job.returnvalue }, "Scrape job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, error: err.message, attempts: job?.attemptsMade }, "Scrape job failed");
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
      connection: redisConnection,
      concurrency: 5, // Send up to 5 emails concurrently
      limiter: {
        max: 100,
        duration: 60000, // Max 100 emails per minute (Resend limit)
      },
    }
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
      { subreddit, sort: "new", limit: 50 },
      {
        repeat: {
          pattern: "*/15 * * * *", // Every 15 minutes
        },
        jobId: `scrape-${subreddit}-new-repeat`,
      }
    );

    // Add repeating job for RISING posts (catches trending deals)
    await scrapeQueue.add(
      `scrape-${subreddit}-rising`,
      { subreddit, sort: "rising", limit: 25 },
      {
        repeat: {
          pattern: "*/30 * * * *", // Every 30 minutes
        },
        jobId: `scrape-${subreddit}-rising-repeat`,
      }
    );

    // Add repeating job for HOT posts (catches popular deals, less frequent)
    await scrapeQueue.add(
      `scrape-${subreddit}-hot`,
      { subreddit, sort: "hot", limit: 25 },
      {
        repeat: {
          pattern: "0 * * * *", // Every hour
        },
        jobId: `scrape-${subreddit}-hot-repeat`,
      }
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

export default {
  scrapeQueue,
  emailQueue,
  createScrapeWorker,
  createEmailWorker,
  scheduleScrapeJobs,
  queueEmail,
  queueScrape,
};
