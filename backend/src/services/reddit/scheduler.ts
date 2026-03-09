import cron from "node-cron";
import prisma from "../../lib/prisma";
import logger from "../../lib/logger";
import {
  fetchSubredditPosts,
  validateSubreddit,
  fetchPostComments,
} from "./client";
import { parseRedditPosts } from "./parser";
import { DealRegion } from "@prisma/client";
import { matchDealsAgainstAlerts } from "../alert-matcher";
import { DealManager } from "../deal-manager";
import { SUBREDDIT_CONFIG, SCRAPE_INTERVALS, BATCH_SIZES } from "../../config/constants";

const SCRAPE_INTERVAL = SCRAPE_INTERVALS.REDDIT_SCRAPER;

let isRunning = false;

// Save deals to database using centralized DealManager
async function saveDeals(deals: any[], region: DealRegion): Promise<number> {
  const result = await DealManager.saveDeals(deals, region);
  return result.savedCount;
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

    // Fetch new and hot posts using constants
    const [newPosts, hotPosts] = await Promise.all([
      fetchSubredditPosts(subreddit, {
        sort: "new",
        limit: BATCH_SIZES.REDDIT_POSTS_NEW,
        before: cursor,
      }),
      fetchSubredditPosts(subreddit, { 
        sort: "hot", 
        limit: BATCH_SIZES.REDDIT_POSTS_HOT 
      }),
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

    // Parse posts into deals (with comment fetching for URLs)
    const commentFetcher = (postId: string) =>
      fetchPostComments(subreddit, postId, BATCH_SIZES.REDDIT_COMMENTS);
    const deals = await parseRedditPosts(uniquePosts, commentFetcher);
    logger.info({ subreddit, dealCount: deals.length }, "Parsed deals");

    // Save to database
    const savedCount = await saveDeals(deals, region);
    logger.info({ subreddit, region, savedCount }, "Saved deals to database");

    // Match saved deals against user price alerts
    if (savedCount > 0) {
      // Fetch the full Deal records we just saved (need IDs for notifications)
      const recentDeals = await prisma.deal.findMany({
        where: {
          redditPostId: { in: deals.map((d) => d.redditPostId) },
        },
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      });
      await matchDealsAgainstAlerts(recentDeals);
    }

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
