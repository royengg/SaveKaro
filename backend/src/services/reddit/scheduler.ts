import cron from "node-cron";
import prisma from "../../lib/prisma";
import logger from "../../lib/logger";
import { fetchSubredditPosts, validateSubreddit } from "./client";
import { parseRedditPosts, ParsedDeal } from "./parser";
import { DealRegion } from "@prisma/client";

// Region-based subreddit configuration
const SUBREDDIT_CONFIG: Record<DealRegion, string[]> = {
  INDIA: ["dealsforindia"],
  WORLD: ["GamingDeals", "deals", "DealsReddit", "dealsonamazon", "DealCove"],
};

const SCRAPE_INTERVAL = "*/30 * * * *"; // Every 30 minutes

let isRunning = false;

// Save deals to database
async function saveDeals(
  deals: ParsedDeal[],
  region: DealRegion,
): Promise<number> {
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
        logger.warn(
          { categorySlug: deal.categorySlug },
          "Category not found, skipping deal",
        );
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
          currency: deal.currency,
          productUrl: deal.productUrl,
          imageUrl: deal.imageUrl,
          store: deal.store,
          source: "REDDIT",
          region: region,
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
      if (
        error instanceof Error &&
        !error.message.includes("Unique constraint")
      ) {
        logger.error({ error, deal: deal.title }, "Failed to save deal");
      }
    }
  }

  return savedCount;
}

// Scrape a single subreddit
async function scrapeSubreddit(
  subreddit: string,
  region: DealRegion,
): Promise<number> {
  logger.info({ subreddit, region }, "Scraping subreddit");

  try {
    // Get cursor for incremental scrape
    const cursorSetting = await prisma.systemSetting.findUnique({
      where: { key: `reddit_cursor_${subreddit}` },
    });
    const cursor = cursorSetting?.value;

    if (cursor) {
      logger.info({ subreddit, cursor }, "Using cursor for incremental scrape");
    }

    // Fetch new and hot posts
    const [newPosts, hotPosts] = await Promise.all([
      fetchSubredditPosts(subreddit, {
        sort: "new",
        limit: 50,
        before: cursor,
      }),
      fetchSubredditPosts(subreddit, { sort: "hot", limit: 25 }),
    ]);

    // Update cursor if new posts found
    if (newPosts.length > 0) {
      const newestPost = newPosts[0];
      // newestPost.name is the fullname (t3_id)
      if (newestPost.name) {
        await prisma.systemSetting.upsert({
          where: { key: `reddit_cursor_${subreddit}` },
          update: { value: newestPost.name },
          create: { key: `reddit_cursor_${subreddit}`, value: newestPost.name },
        });
        logger.info(
          { subreddit, newCursor: newestPost.name },
          "Updated scrape cursor",
        );
      }
    }

    // Combine and dedupe posts
    const allPosts = [...newPosts, ...hotPosts];
    const uniquePosts = allPosts.filter(
      (post, index, self) => self.findIndex((p) => p.id === post.id) === index,
    );

    logger.info({ subreddit, postCount: uniquePosts.length }, "Fetched posts");

    // Parse posts into deals
    const deals = await parseRedditPosts(uniquePosts);
    logger.info({ subreddit, dealCount: deals.length }, "Parsed deals");

    // Save to database
    const savedCount = await saveDeals(deals, region);
    logger.info({ subreddit, region, savedCount }, "Saved deals to database");

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

    // Iterate over all regions and their subreddits
    for (const [region, subreddits] of Object.entries(SUBREDDIT_CONFIG) as [
      DealRegion,
      string[],
    ][]) {
      logger.info(
        { region, subredditCount: subreddits.length },
        "Scraping region",
      );

      for (const subreddit of subreddits) {
        // Validate subreddit exists before scraping
        const isValid = await validateSubreddit(subreddit);
        if (!isValid) {
          logger.warn({ subreddit, region }, "Skipping invalid subreddit");
          continue;
        }

        const count = await scrapeSubreddit(subreddit, region);
        totalSaved += count;

        // Small delay between subreddits to respect rate limits
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    logger.info(
      { totalSaved, durationSeconds: duration },
      "Scrape complete. Next run in ~30 mins.",
    );
  } catch (error) {
    logger.error({ error }, "Scrape failed");
  } finally {
    isRunning = false;
  }
}

// Start the scheduler
export function startScheduler(): void {
  logger.info(
    { interval: SCRAPE_INTERVAL },
    "Starting Reddit scraper scheduler (Runs every 30 minutes)",
  );

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
