import cron from "node-cron";
import prisma from "../../lib/prisma";
import logger from "../../lib/logger";
import { fetchSubredditPosts } from "./client";
import { parseRedditPosts, ParsedDeal } from "./parser";

const SUBREDDITS = ["dealsforindia"];
const SCRAPE_INTERVAL = "*/30 * * * *"; // Every 30 minutes

let isRunning = false;

// Save deals to database
async function saveDeals(deals: ParsedDeal[]): Promise<number> {
  let savedCount = 0;

  for (const deal of deals) {
    try {
      // Get category ID
      let category = await prisma.category.findUnique({
        where: { slug: deal.categorySlug },
      });

      if (!category) {
        category = await prisma.category.findUnique({
          where: { slug: "other" },
        });
      }

      if (!category) {
        logger.warn({ categorySlug: deal.categorySlug }, "Category not found, skipping deal");
        continue;
      }

      // Upsert deal (update if exists, create if not)
      await prisma.deal.upsert({
        where: { redditPostId: deal.redditPostId },
        update: {
          title: deal.title,
          description: deal.description,
          redditScore: deal.redditScore,
          // Don't update prices to preserve history
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

      // Add price history entry if dealPrice exists
      if (deal.dealPrice) {
        const existingDeal = await prisma.deal.findUnique({
          where: { redditPostId: deal.redditPostId },
          select: { id: true },
        });

        if (existingDeal) {
          // Check if price changed
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
      // Ignore duplicate errors, log others
      if (error instanceof Error && !error.message.includes("Unique constraint")) {
        logger.error({ error, deal: deal.title }, "Failed to save deal");
      }
    }
  }

  return savedCount;
}

// Scrape a single subreddit
async function scrapeSubreddit(subreddit: string): Promise<number> {
  logger.info({ subreddit }, "Scraping subreddit");

  try {
    // Fetch new and hot posts
    const [newPosts, hotPosts] = await Promise.all([
      fetchSubredditPosts(subreddit, { sort: "new", limit: 50 }),
      fetchSubredditPosts(subreddit, { sort: "hot", limit: 25 }),
    ]);

    // Combine and dedupe posts
    const allPosts = [...newPosts, ...hotPosts];
    const uniquePosts = allPosts.filter(
      (post, index, self) => self.findIndex((p) => p.id === post.id) === index
    );

    logger.info({ subreddit, postCount: uniquePosts.length }, "Fetched posts");

    // Parse posts into deals
    const deals = parseRedditPosts(uniquePosts);
    logger.info({ subreddit, dealCount: deals.length }, "Parsed deals");

    // Save to database
    const savedCount = await saveDeals(deals);
    logger.info({ subreddit, savedCount }, "Saved deals to database");

    return savedCount;
  } catch (error) {
    logger.error({ error, subreddit }, "Failed to scrape subreddit");
    return 0;
  }
}

// Run a full scrape of all subreddits
export async function runScrape(): Promise<void> {
  if (isRunning) {
    logger.warn("Scrape already in progress, skipping");
    return;
  }

  isRunning = true;
  const startTime = Date.now();
  logger.info("Starting deal scrape");

  try {
    let totalSaved = 0;

    for (const subreddit of SUBREDDITS) {
      const count = await scrapeSubreddit(subreddit);
      totalSaved += count;

      // Small delay between subreddits to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const duration = (Date.now() - startTime) / 1000;
    logger.info({ totalSaved, durationSeconds: duration }, "Scrape complete");
  } catch (error) {
    logger.error({ error }, "Scrape failed");
  } finally {
    isRunning = false;
  }
}

// Start the scheduler
export function startScheduler(): void {
  logger.info({ interval: SCRAPE_INTERVAL }, "Starting Reddit scraper scheduler");

  // Run immediately on startup
  runScrape();

  // Schedule recurring scrapes
  cron.schedule(SCRAPE_INTERVAL, () => {
    runScrape();
  });
}

// Stop the scheduler (for graceful shutdown)
export function stopScheduler(): void {
  logger.info("Stopping Reddit scraper scheduler");
  // node-cron doesn't have a global stop, but tasks are cleaned up on process exit
}

export default {
  runScrape,
  startScheduler,
  stopScheduler,
  scrapeSubreddit,
};
