import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { Job } from "bullmq";
import type { ScrapeJobData } from "./queues";

type Processor = (
  job: Pick<Job<ScrapeJobData>, "id" | "data">,
) => Promise<unknown>;
let queuedProcessor: Processor;
const parsedDeal = { redditPostId: "post" };
const savedDeal = { id: "saved-deal", redditPostId: "post", category: null };
const saveDeals = mock(async () => ({
  savedCount: 1,
  skippedCount: 0,
  errorCount: 0,
}));
const matchAlerts = mock(async (_deals: unknown[]) => 1);
const fetchPosts = mock(async () => [{ id: "post", name: "t3_post" }]);
const parsePosts = mock(async () => [parsedDeal]);
const findSaved = mock(async () => [savedDeal]);
const connection = { status: "ready" };

mock.module("bullmq", () => ({
  Queue: class {},
  Worker: class {
    constructor(_name: string, processor: Processor) {
      queuedProcessor = processor;
    }
    on() {
      return this;
    }
  },
}));
mock.module("../lib/redis", () => ({
  getRedisConnection: () => connection,
  getRedisWorkerConnection: () => connection,
}));
mock.module("../lib/prisma", () => ({
  default: {
    systemSetting: { findUnique: async () => null, upsert: async () => ({}) },
    deal: { findMany: findSaved },
  },
}));
mock.module("../lib/logger", () => ({
  default: { info() {}, warn() {}, error() {} },
}));
mock.module("../lib/cache", () => ({ cacheInvalidate: async () => {} }));
mock.module("./gamification", () => ({ GamificationService: {} }));
mock.module("./deal-manager", () => ({ DealManager: { saveDeals } }));
mock.module("./alert-matcher", () => ({
  matchDealsAgainstAlerts: matchAlerts,
}));
mock.module("./reddit/client", () => ({
  fetchSubredditPosts: fetchPosts,
  fetchPostComments: async () => [],
  validateSubreddit: async () => true,
}));
mock.module("./reddit/parser", () => ({ parseRedditPosts: parsePosts }));

const { createScrapeWorker } = await import("./queues");
const { default: scheduler } = await import("./reddit/scheduler");

beforeEach(() => {
  saveDeals
    .mockReset()
    .mockResolvedValue({ savedCount: 1, skippedCount: 0, errorCount: 0 });
  matchAlerts.mockReset().mockResolvedValue(1);
  fetchPosts.mockClear();
  parsePosts.mockClear();
  findSaved.mockClear();
  // Constructing a fake Worker captures the real application processor;
  // no queue connection, scheduled job, or scraper service is started.
  createScrapeWorker();
});

function runQueuedScrape() {
  return queuedProcessor({
    id: "test-job",
    data: { subreddit: "test", region: "INDIA" },
  });
}

describe("scraper mode alert parity", () => {
  test("in-process scraping matches persisted deals after successful ingestion", async () => {
    expect(await scheduler.scrapeSubreddit("test", "INDIA")).toBe(1);
    expect(saveDeals).toHaveBeenCalledWith([parsedDeal], "INDIA");
    expect(matchAlerts).toHaveBeenCalledWith([savedDeal]);
    expect(findSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { region: "INDIA", redditPostId: { in: ["post"] } },
      }),
    );
  });

  test("[regression] queued scraping must also match alerts after successful ingestion", async () => {
    await expect(runQueuedScrape()).resolves.toMatchObject({ savedCount: 1 });
    expect(saveDeals).toHaveBeenCalledWith([parsedDeal], "INDIA");
    expect(matchAlerts).toHaveBeenCalledWith([savedDeal]);
  });

  test("an unsuccessful queued save propagates failure without delivering alerts", async () => {
    saveDeals.mockRejectedValueOnce(new Error("save failed"));
    await expect(runQueuedScrape()).rejects.toThrow("save failed");
    expect(matchAlerts).not.toHaveBeenCalled();
  });

  test("in-process scraping skips alert dispatch when no new deals are saved", async () => {
    saveDeals.mockResolvedValueOnce({
      savedCount: 0,
      skippedCount: 1,
      errorCount: 0,
    });
    expect(await scheduler.scrapeSubreddit("test", "INDIA")).toBe(0);
    expect(matchAlerts).not.toHaveBeenCalled();
    expect(findSaved).not.toHaveBeenCalled();
  });

  test("queued scraping skips alert dispatch when every deal is skipped", async () => {
    saveDeals.mockResolvedValueOnce({
      savedCount: 0,
      skippedCount: 1,
      errorCount: 0,
    });
    await expect(runQueuedScrape()).resolves.toMatchObject({ savedCount: 0 });
    expect(findSaved).not.toHaveBeenCalled();
    expect(matchAlerts).not.toHaveBeenCalled();
  });

  test("queued alert dispatch uses persisted records from the job's region", async () => {
    await queuedProcessor({
      id: "canada-job",
      data: { subreddit: "test", region: "CANADA" },
    });
    expect(findSaved).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { region: "CANADA", redditPostId: { in: ["post"] } },
      }),
    );
    expect(matchAlerts).toHaveBeenCalledTimes(1);
    expect(matchAlerts).toHaveBeenCalledWith([savedDeal]);
  });

  test("an alert pipeline failure is reported as a failed job, not a successful dispatch", async () => {
    matchAlerts.mockRejectedValueOnce(new Error("alerts unavailable"));
    await expect(runQueuedScrape()).rejects.toThrow("alerts unavailable");
  });
});
