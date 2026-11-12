import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { Job } from "bullmq";
import type { ScrapeJobData } from "./queues";
import type { RedditPost } from "./reddit/client";
import type { ParsedDeal } from "./reddit/parser";

type TestJob = Pick<Job<ScrapeJobData>, "id" | "data" | "updateData">;
let processJob: (job: TestJob) => Promise<unknown>;
function post(id: string): RedditPost {
  return {
    id,
    name: `t3_${id}`,
    title: `Laptop sale ${id}`,
    selftext: "",
    url: `https://shop.example.test/products/${id}`,
    permalink: `/r/test/comments/${id}`,
    score: 1,
    created_utc: 1,
    thumbnail: "",
    is_self: false,
    domain: "shop.example.test",
  };
}
const originalBatch = [post("newer"), post("older")];
let cursor: string;
let listing: RedditPost[];
let failedIds: Set<string>;
let records: Map<string, Record<string, unknown>>;
let events: string[];
let failHot: boolean;
let failCheckpoint: boolean;
const alerts = mock(async (_deals: unknown[]) => 0);
const parse = mock(
  async (posts: RedditPost[]): Promise<ParsedDeal[]> =>
    posts.map((item) => ({
      title: item.title,
      description: "",
      originalPrice: null,
      dealPrice: null,
      discountPercent: null,
      currency: "INR",
      productUrl: item.url,
      imageUrl: null,
      store: "Example Store",
      categorySlug: "electronics",
      redditPostId: item.id,
      redditScore: 1,
    })),
);
const fetchPosts = mock(
  async (_subreddit: string, options: { sort: string; before?: string }) => {
    if (options.sort === "hot") {
      if (failHot) throw new Error("temporary listing failure");
      return [];
    }
    return options.before === "t3_newer" ? [] : listing;
  },
);

// Exercise the actual scheduler, queue processor and DealManager; mock only
// external boundaries so caught per-record write failures are represented too.
mock.module("../lib/prisma", () => ({
  default: {
    systemSetting: {
      findUnique: async () => ({ value: cursor }),
      upsert: async ({ update }: { update: { value: string } }) => {
        if (failCheckpoint) throw new Error("checkpoint write failed");
        cursor = update.value;
        events.push("checkpoint");
        return { value: cursor };
      },
    },
    category: {
      findUnique: async () => ({ id: "category", slug: "electronics" }),
    },
    deal: {
      findUnique: async ({ where }: { where: { redditPostId: string } }) =>
        records.get(where.redditPostId) ?? null,
      findMany: async ({ take }: { take?: number }) =>
        take ? [] : [...records.values()],
      upsert: async ({
        where,
        create,
        update,
      }: {
        where: { redditPostId: string };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        events.push(`save:${where.redditPostId}`);
        if (failedIds.has(where.redditPostId))
          throw new Error("temporary database failure");
        const existing = records.get(where.redditPostId);
        const value = existing
          ? { ...existing, ...update }
          : { ...create, id: `db-${where.redditPostId}`, cleanTitle: null };
        records.set(where.redditPostId, value);
        return { id: value.id };
      },
    },
  },
}));
mock.module("../lib/logger", () => ({
  default: { info() {}, warn() {}, error() {} },
}));
mock.module("../lib/cache", () => ({
  cacheInvalidatePattern: async () => {},
  cacheInvalidate: async () => {},
}));
mock.module("../lib/redis", () => ({
  getRedisConnection: () => ({ status: "ready" }),
  getRedisWorkerConnection: () => ({ status: "ready" }),
}));
mock.module("./amazon-url-service", () => ({
  resolveAmazonProductUrl: async (url: string) => url,
}));
mock.module("./alert-matcher", () => ({ matchDealsAgainstAlerts: alerts }));
mock.module("./gamification", () => ({ GamificationService: {} }));
mock.module("./reddit/parser", () => ({ parseRedditPosts: parse }));
mock.module("./reddit/client", () => ({
  fetchSubredditPosts: fetchPosts,
  fetchPostComments: async () => [],
  validateSubreddit: async () => true,
}));
mock.module("bullmq", () => ({
  Queue: class {},
  Worker: class {
    constructor(_name: string, run: typeof processJob) {
      processJob = run;
    }
    on() {
      return this;
    }
  },
}));
const { default: scheduler } = await import("./reddit/scheduler");
const { createScrapeWorker } = await import("./queues");

function job(
  id = "test-job",
  data: ScrapeJobData = { subreddit: "test", region: "INDIA" },
): TestJob {
  const value: TestJob = {
    id,
    data,
    updateData: mock(async (next: ScrapeJobData) => {
      value.data = structuredClone(next);
    }),
  };
  return value;
}

beforeEach(() => {
  cursor = "t3_previous";
  listing = structuredClone(originalBatch);
  failedIds = new Set();
  records = new Map();
  events = [];
  failHot = false;
  failCheckpoint = false;
  parse.mockClear();
  fetchPosts.mockClear();
  alerts.mockClear();
  createScrapeWorker();
});

describe("in-process checkpoint recovery", () => {
  test.each([{ failed: ["newer", "older"] }, { failed: ["older"] }])(
    "write failures $failed retain the cursor and recover without partial alerts",
    async ({ failed }) => {
      failedIds = new Set(failed);
      expect(await scheduler.scrapeSubreddit("test", "INDIA")).toBe(0);
      expect(cursor).toBe("t3_previous");
      expect(alerts).not.toHaveBeenCalled();
      failedIds.clear();
      expect(await scheduler.scrapeSubreddit("test", "INDIA")).toBe(2);
      expect([...records.keys()].sort()).toEqual(["newer", "older"].sort());
      expect(cursor).toBe("t3_newer");
      expect(events.lastIndexOf("checkpoint")).toBeGreaterThan(
        events.lastIndexOf("save:older"),
      );
      expect(alerts).toHaveBeenCalledTimes(1);
    },
  );

  test("parser failure retains the cursor and a later run can recover", async () => {
    parse.mockRejectedValueOnce(new Error("parse failed"));
    expect(await scheduler.scrapeSubreddit("test", "INDIA")).toBe(0);
    expect(cursor).toBe("t3_previous");
    expect(await scheduler.scrapeSubreddit("test", "INDIA")).toBe(2);
  });

  test("checkpoint failure leaves saved deals safely replayable without premature alerts", async () => {
    failCheckpoint = true;
    expect(await scheduler.scrapeSubreddit("test", "INDIA")).toBe(0);
    expect(records.size).toBe(2);
    expect(cursor).toBe("t3_previous");
    expect(alerts).not.toHaveBeenCalled();
    failCheckpoint = false;
    expect(await scheduler.scrapeSubreddit("test", "INDIA")).toBe(2);
    expect(records.size).toBe(2);
    expect(alerts).toHaveBeenCalledTimes(1);
  });

  test("intentional filtering advances the cursor even when nothing is saved", async () => {
    parse.mockResolvedValueOnce([]);
    expect(await scheduler.scrapeSubreddit("test", "INDIA")).toBe(0);
    expect(cursor).toBe("t3_newer");
    expect(alerts).not.toHaveBeenCalled();
  });

  test("listing failure retains the cursor", async () => {
    failHot = true;
    await scheduler.scrapeSubreddit("test", "INDIA");
    expect(cursor).toBe("t3_previous");
  });
});

describe("queued scrape recovery", () => {
  test("partial save failure retries the original batch after the live listing changes", async () => {
    const first = job();
    failedIds.add("older");
    await expect(processJob(first)).rejects.toThrow();
    expect(alerts).not.toHaveBeenCalled();
    failedIds.clear();
    listing = [post("unrelated")];
    // Recreate the job to model BullMQ loading its durable data for a retry.
    await expect(
      processJob(job(first.id, structuredClone(first.data))),
    ).resolves.toMatchObject({ savedCount: 2 });
    expect([...records.keys()].sort()).toEqual(["newer", "older"].sort());
    expect(fetchPosts).toHaveBeenCalledTimes(1);
    expect(alerts).toHaveBeenCalledTimes(1);
  });

  test("parser failure retains the original batch for the job's retry", async () => {
    const first = job();
    parse.mockRejectedValueOnce(new Error("parse failed"));
    await expect(processJob(first)).rejects.toThrow("parse failed");
    listing = [post("unrelated")];
    await processJob(job(first.id, structuredClone(first.data)));
    expect([...records.keys()].sort()).toEqual(["newer", "older"].sort());
    expect(fetchPosts).toHaveBeenCalledTimes(1);
  });

  test("a new repeat job does not reuse its predecessor's captured batch", async () => {
    const first = job("first-job");
    await processJob(first);
    listing = [post("fresh")];
    const next = job("next-job", structuredClone(first.data));
    await processJob(next);
    expect(records.has("fresh")).toBe(true);
    expect(fetchPosts).toHaveBeenCalledTimes(2);
  });

  test("failure to persist a batch stops processing before any database writes", async () => {
    const first = job();
    first.updateData = async () => {
      throw new Error("snapshot unavailable");
    };
    await expect(processJob(first)).rejects.toThrow("snapshot unavailable");
    expect(records.size).toBe(0);
    expect(parse).not.toHaveBeenCalled();
    expect(alerts).not.toHaveBeenCalled();
  });
});
