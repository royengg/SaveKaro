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
let scrapeTask: ReturnType<typeof cron.schedule> | null = null;

async function saveDeals(deals: any[], region: DealRegion): Promise<number> {
  const result = await DealManager.saveDeals(deals, region);
  return result.savedCount;
}

async function scrapeSubreddit(
  subreddit: string,
  region: DealRegion,
): Promise<number> {
  logger.info({ subreddit, region }, "Scraping subreddit");

  try {
    const cursorSetting = await prisma.systemSetting.findUnique({
      where: { key: `reddit_cursor_${subreddit}` },
    });
    const cursor = cursorSetting?.value;

    if (cursor) {
      logger.info({ subreddit, cursor }, "Using cursor for incremental scrape");
    }

    const newPosts = await fetchSubredditPosts(subreddit, {
      sort: "new",
      limit: BATCH_SIZES.REDDIT_POSTS_NEW,
      before: cursor,
    });
    const hotPosts = await fetchSubredditPosts(subreddit, {
      sort: "hot",
      limit: BATCH_SIZES.REDDIT_POSTS_HOT,
    });

    if (newPosts.length > 0) {
      const newestPost = newPosts[0];
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

    const allPosts = [...newPosts, ...hotPosts];
    const uniquePosts = allPosts.filter(
      (post, index, self) => self.findIndex((p) => p.id === post.id) === index,
    );

    logger.info({ subreddit, postCount: uniquePosts.length }, "Fetched posts");

    const commentFetcher = (postId: string) =>
      fetchPostComments(subreddit, postId, BATCH_SIZES.REDDIT_COMMENTS);
    const deals = await parseRedditPosts(uniquePosts, commentFetcher);
    logger.info({ subreddit, dealCount: deals.length }, "Parsed deals");

    const savedCount = await saveDeals(deals, region);
    logger.info({ subreddit, region, savedCount }, "Saved deals to database");

    if (savedCount > 0) {
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

    for (const [region, subreddits] of Object.entries(SUBREDDIT_CONFIG) as [
      DealRegion,
      string[],
    ][]) {
      logger.info(
        { region, subredditCount: subreddits.length },
        "Scraping region",
      );

      for (const subreddit of subreddits) {
        const isValid = await validateSubreddit(subreddit);
        if (!isValid) {
          logger.warn({ subreddit, region }, "Skipping invalid subreddit");
          continue;
        }

        const count = await scrapeSubreddit(subreddit, region);
        totalSaved += count;

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

export function startScheduler(): void {
  if (scrapeTask) {
    return;
  }

  logger.info(
    { interval: SCRAPE_INTERVAL },
    "Starting Reddit scraper scheduler (Runs every 30 minutes)",
  );

  void runScrape();

  scrapeTask = cron.schedule(SCRAPE_INTERVAL, () => {
    void runScrape();
  });
}

export function stopScheduler(): void {
  logger.info("Stopping Reddit scraper scheduler");
  scrapeTask?.stop();
  scrapeTask = null;
}

export default {
  runScrape,
  startScheduler,
  stopScheduler,
  scrapeSubreddit,
};
