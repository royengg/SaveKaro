import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";

const fakeDeals = Array.from({ length: 455 }, (_, index) => ({
  id: `deal-${index + 1}`,
  title: `Deal ${index + 1}: Nike running shoes with coupon SAVEKARO${index + 1}`,
  productUrl: `https://www.myntra.com/shoes/${index + 1}`,
  brand: null,
  categoryId: "category-other",
  category: { slug: "other" },
}));

const capturedDealQueries: Array<Record<string, unknown>> = [];
const processedDealIds = new Set<string>();
let dealUpdateCount = 0;
let generateContentCount = 0;
let requestedModelName: string | null = null;
let redisRequestCount = 0;
const scheduledTasks: Array<{
  pattern: string;
  options?: { timezone?: string };
}> = [];

const originalSetTimeout = globalThis.setTimeout;

process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.GEMINI_TITLE_MODEL = "gemini-3.1-flash-lite";
process.env.USE_QUEUE = "true";
process.env.REDIS_URL = "redis://production-redis:6379";

mock.module("../lib/prisma", () => ({
  default: {
    deal: {
      findMany: async (query: Record<string, unknown>) => {
        capturedDealQueries.push(query);
        return fakeDeals
          .filter((deal) => !processedDealIds.has(deal.id))
          .slice(0, Number(query.take));
      },
      update: async (query: { where: { id: string } }) => {
        processedDealIds.add(query.where.id);
        dealUpdateCount++;
      },
    },
    category: {
      findMany: async () => [
        { id: "category-other", slug: "other" },
        { id: "category-fashion", slug: "fashion" },
      ],
    },
  },
}));

mock.module("../lib/logger", () => ({
  default: {
    debug: () => undefined,
    error: () => undefined,
    info: () => undefined,
    warn: () => undefined,
  },
}));

mock.module("../lib/redis", () => ({
  getRedisConnection: () => ({
    eval: async (
      _script: string,
      _numberOfKeys: number,
      _key: string,
      limit: number,
    ) => {
      if (redisRequestCount >= Number(limit)) {
        return [0, redisRequestCount];
      }
      redisRequestCount++;
      return [1, redisRequestCount];
    },
  }),
}));

mock.module("node-cron", () => ({
  default: {
    schedule: (
      pattern: string,
      _callback: () => void,
      options?: { timezone?: string },
    ) => {
      scheduledTasks.push({ pattern, options });
      return { stop: () => undefined };
    },
  },
}));

mock.module("@google/generative-ai", () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel(options: { model: string }) {
      requestedModelName = options.model;
      return {
        generateContent: async () => {
          generateContentCount++;
          return {
            response: {
              text: () =>
                JSON.stringify({
                  cleanTitle: "Nike Running Shoes",
                  brand: "Nike",
                  suggestedCategory: "fashion",
                }),
            },
          };
        },
      };
    }
  },
  GoogleGenerativeAIAbortError: class extends Error {},
  GoogleGenerativeAIFetchError: class extends Error {},
  SchemaType: {
    OBJECT: "object",
    STRING: "string",
  },
}));

const classifier = await import("./title-classifier");

describe("production title-classifier schedule", () => {
  beforeAll(() => {
    globalThis.setTimeout = ((callback: () => void) => {
      callback();
      return 0;
    }) as typeof setTimeout;
  });

  afterAll(() => {
    classifier.stopTitleClassifierScheduler();
    globalThis.setTimeout = originalSetTimeout;
  });

  test("registers one interval task after each scraper run", () => {
    classifier.startTitleClassifierScheduler();

    expect(scheduledTasks).toHaveLength(1);
    expect(scheduledTasks[0]).toEqual({
      pattern: "10,40 * * * *",
      options: { timezone: "Asia/Kolkata" },
    });
  });

  test("repeatedly processes only unclean deals until the shared daily cap", async () => {
    const intervalResults = [];
    for (let run = 0; run < 23; run++) {
      intervalResults.push(
        await classifier.processUnclassifiedDeals(20, {
          oldestFirst: false,
        }),
      );
    }

    expect(capturedDealQueries).toHaveLength(23);
    for (const query of capturedDealQueries) {
      expect(query).toMatchObject({
        where: {
          titleProcessedAt: null,
          isActive: true,
        },
        take: 20,
        orderBy: { createdAt: "desc" },
      });
    }
    expect(intervalResults.slice(0, 22)).toEqual(
      Array.from({ length: 22 }, () => ({
        processed: 20,
        failed: 0,
        skipped: 0,
        categoriesUpdated: 20,
        deferred: 0,
      })),
    );
    expect(intervalResults[22]).toEqual({
      processed: 10,
      failed: 0,
      skipped: 0,
      categoriesUpdated: 10,
      deferred: 5,
    });
    expect(dealUpdateCount).toBe(450);
    expect(processedDealIds.size).toBe(450);
    expect(generateContentCount).toBe(450);
    expect(requestedModelName).toBe("gemini-3.1-flash-lite");

    const overBudgetRequest = await classifier.default.classifyDeal(
      "Another noisy deal title with coupon SAVE20",
      "https://www.example.com/product",
      "other",
    );

    expect(overBudgetRequest).toEqual({
      status: "temporary-failure",
      reason: "gemini_daily_request_limit_reached",
    });
    expect(generateContentCount).toBe(450);
  });
});
