import cron from "node-cron";
import {
  GoogleGenerativeAI,
  GoogleGenerativeAIAbortError,
  GoogleGenerativeAIFetchError,
  SchemaType,
} from "@google/generative-ai";
import type { Schema } from "@google/generative-ai";
import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { BATCH_SIZES, SCRAPE_INTERVALS } from "../config/constants";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_TITLE_MODEL || "gemini-2.5-flash-lite";
const REQUEST_DELAY_MS = Math.max(
  4000,
  parseInt(process.env.GEMINI_TITLE_DELAY_MS || "4500", 10) || 4500,
);
const MANUAL_BATCH_SIZE = BATCH_SIZES.TITLE_CLASSIFIER;
const INCREMENTAL_BATCH_SIZE = BATCH_SIZES.TITLE_CLASSIFIER_INCREMENTAL;
const BACKFILL_BATCH_SIZE = BATCH_SIZES.TITLE_CLASSIFIER_BACKFILL;
const CLASSIFIER_TIMEZONE = "Asia/Kolkata";
const MAX_CLEAN_TITLE_LENGTH = 90;
const RATE_LIMIT_COOLDOWN_MS = Math.max(
  5 * 60 * 1000,
  parseInt(process.env.GEMINI_TITLE_RATE_LIMIT_COOLDOWN_MS || "1800000", 10) ||
    1800000,
);
const QUOTA_COOLDOWN_MS = Math.max(
  30 * 60 * 1000,
  parseInt(process.env.GEMINI_TITLE_QUOTA_COOLDOWN_MS || "43200000", 10) ||
    43200000,
);
const SERVER_ERROR_COOLDOWN_MS = Math.max(
  2 * 60 * 1000,
  parseInt(process.env.GEMINI_TITLE_SERVER_ERROR_COOLDOWN_MS || "900000", 10) ||
    900000,
);

interface TitleClassification {
  cleanTitle: string;
  brand: string | null;
  suggestedCategory: ValidCategorySlug | null;
}

interface ProcessingResult {
  processed: number;
  failed: number;
  skipped: number;
  categoriesUpdated: number;
  deferred: number;
}

interface ProcessUnclassifiedDealsOptions {
  oldestFirst?: boolean;
}

type ClassifyDealResult =
  | {
      status: "success";
      classification: TitleClassification;
    }
  | {
      status: "temporary-failure";
      reason: string;
    }
  | {
      status: "permanent-failure";
      reason: string;
    };

const VALID_CATEGORY_SLUGS = [
  "electronics",
  "fashion",
  "gaming",
  "home-kitchen",
  "beauty",
  "food-groceries",
  "mobile-accessories",
  "books-stationery",
  "travel",
  "other",
] as const;

type ValidCategorySlug = (typeof VALID_CATEGORY_SLUGS)[number];

const CATEGORY_ALIAS_MAP: Record<string, ValidCategorySlug> = {
  "home": "home-kitchen",
  "home & kitchen": "home-kitchen",
  "home and kitchen": "home-kitchen",
  "kitchen": "home-kitchen",
  "grocery": "food-groceries",
  "groceries": "food-groceries",
  "food": "food-groceries",
  "food-grocery": "food-groceries",
  "mobile": "mobile-accessories",
  "accessories": "mobile-accessories",
  "mobile accessories": "mobile-accessories",
  "mobile & accessories": "mobile-accessories",
  "books": "books-stationery",
  "stationery": "books-stationery",
  "books & stationery": "books-stationery",
  "books and stationery": "books-stationery",
  "office": "books-stationery",
};

const TITLE_CLASSIFICATION_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    cleanTitle: {
      type: SchemaType.STRING,
      description:
        "A concise, human-readable product title between 10 and 90 characters.",
    },
    brand: {
      type: SchemaType.STRING,
      nullable: true,
      description:
        "The product brand when clearly identifiable. Null if unclear.",
    },
    suggestedCategory: {
      type: SchemaType.STRING,
      nullable: true,
      format: "enum",
      enum: [...VALID_CATEGORY_SLUGS],
      description:
        "The best matching category slug from the provided list, or null if not confident.",
    },
  },
  required: ["cleanTitle"],
};

const TITLE_NOISE_PATTERNS = [
  /\[[^\]]+\]/,
  /\([^)]+\)/,
  /\b(link\s+in\s+comments|check\s+comments|read\s+caption)\b/i,
  /https?:\/\//i,
  /\b[A-Z0-9]{8,}\b/,
  /(?:\||:){2,}/,
] as const;

const TITLE_WRAPPER_PATTERNS = [
  /(link\s+in\s+comments|check\s+comments|read\s+caption)/gi,
  /^\s*(deal|offer|loot|sale)\s*[:|-]\s*/i,
  /^\s*\[[^\]]+\]\s*/g,
  /\s{2,}/g,
] as const;

let inProcessIncrementalTask: ReturnType<typeof cron.schedule> | null = null;
let inProcessBackfillTask: ReturnType<typeof cron.schedule> | null = null;
let isInProcessRunActive = false;
let geminiClient: GoogleGenerativeAI | null = null;
let geminiCooldownUntil = 0;
let geminiCooldownReason: string | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCooldownRemainingMs() {
  return Math.max(0, geminiCooldownUntil - Date.now());
}

function isGeminiCoolingDown() {
  return getCooldownRemainingMs() > 0;
}

function activateGeminiCooldown(cooldownMs: number, reason: string) {
  const nextCooldownUntil = Date.now() + cooldownMs;
  if (nextCooldownUntil > geminiCooldownUntil) {
    geminiCooldownUntil = nextCooldownUntil;
    geminiCooldownReason = reason;
  }
}

function getGeminiClient() {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
  return geminiClient;
}

function getGeminiModel() {
  return getGeminiClient().getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.1,
      topP: 0.9,
      maxOutputTokens: 220,
      responseMimeType: "application/json",
      responseSchema: TITLE_CLASSIFICATION_SCHEMA,
    },
  });
}

function normalizeHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^(www|m)\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function getExpectedCategoryFromUrl(productUrl: string): ValidCategorySlug | null {
  const host = normalizeHost(productUrl);
  if (!host) {
    return null;
  }

  if (
    host === "myntra.com" ||
    host === "ajio.com" ||
    host === "ajio.co" ||
    host === "ajio.me" ||
    host === "ajiio.in" ||
    host === "ajiio.co" ||
    host === "ajiio.me" ||
    host === "tatacliq.com"
  ) {
    return "fashion";
  }

  if (host === "nykaa.com") {
    return "beauty";
  }

  if (
    host === "blinkit.com" ||
    host === "zepto.co" ||
    host === "bigbasket.com" ||
    host === "jiomart.com" ||
    host === "swiggy.com"
  ) {
    return "food-groceries";
  }

  if (
    host === "store.steampowered.com" ||
    host === "steampowered.com" ||
    host === "epicgames.com" ||
    host === "gog.com"
  ) {
    return "gaming";
  }

  if (host === "croma.com" || host === "reliancedigital.in") {
    return "electronics";
  }

  return null;
}

function buildPrompt(
  title: string,
  productUrl: string,
  currentCategorySlug: string,
): string {
  return `You classify retail product deals for SaveKaro.

Input title: "${title}"
Product URL: ${productUrl}
Current category slug: ${currentCategorySlug}

Return JSON with:
- cleanTitle: Keep the product intent, brand, and most important attribute. Remove deal wrappers, noisy punctuation, repetitive wording, coupon spam, and useless SKU-like garbage. Keep it natural and concise.
- brand: Extract the brand only if clearly identifiable from the title or URL.
- suggestedCategory: Return exactly one slug from this list when confident:
${VALID_CATEGORY_SLUGS.join(", ")}

Category guidance:
- Ajio, Myntra, TataCliq apparel, shoes, handbags -> fashion
- Nykaa, makeup, skincare, fragrance -> beauty
- Phones, laptops, earbuds, chargers, smartwatches -> electronics
- Phone cases, cables, screen guards, power banks, accessories -> mobile-accessories
- Grocery, food, snacks, beverages, pantry -> food-groceries
- Furniture, kitchenware, cookware, appliances, mattresses -> home-kitchen
- Books, notebooks, pens, study supplies, office stationery -> books-stationery
- Flights, hotels, luggage, travel gear -> travel
- Games, consoles, gaming accessories -> gaming
- Use other only if nothing else is a strong match

Rules:
- cleanTitle must be 10 to ${MAX_CLEAN_TITLE_LENGTH} characters.
- Do not include discount text, "deal", "offer", "link in comments", or store prefixes unless needed for clarity.
- If the current category is already clearly correct, it is fine to return the same slug.
- If category confidence is low, return null for suggestedCategory.
`;
}

function normalizeSuggestedCategory(
  suggestedCategory: string | null | undefined,
): ValidCategorySlug | null {
  const normalized = suggestedCategory?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (
    VALID_CATEGORY_SLUGS.includes(normalized as ValidCategorySlug)
  ) {
    return normalized as ValidCategorySlug;
  }

  return CATEGORY_ALIAS_MAP[normalized] ?? null;
}

function createHeuristicCleanTitle(title: string): string {
  let cleaned = title.trim();

  for (const pattern of TITLE_WRAPPER_PATTERNS) {
    cleaned = cleaned.replace(pattern, " ");
  }

  cleaned = cleaned
    .replace(/\s*\|\s*/g, " | ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[!\s\-\|:]+|[!\s\-\|:]+$/g, "")
    .trim();

  if (!cleaned) {
    cleaned = title.trim();
  }

  if (cleaned.length > MAX_CLEAN_TITLE_LENGTH) {
    cleaned = `${cleaned.slice(0, MAX_CLEAN_TITLE_LENGTH - 3).trimEnd()}...`;
  }

  return cleaned;
}

function shouldUseAiClassification(
  title: string,
  productUrl: string,
  currentCategorySlug: string,
): boolean {
  const normalizedTitle = title.trim();
  const separatorCount = (normalizedTitle.match(/[|:[\](){}]/g) || []).length;
  const expectedCategory = getExpectedCategoryFromUrl(productUrl);

  return (
    currentCategorySlug === "other" ||
    (expectedCategory !== null && expectedCategory !== currentCategorySlug) ||
    normalizedTitle.length > 72 ||
    separatorCount >= 3 ||
    TITLE_NOISE_PATTERNS.some((pattern) => pattern.test(normalizedTitle))
  );
}

async function classifyDeal(
  title: string,
  productUrl: string,
  currentCategorySlug: string,
): Promise<ClassifyDealResult> {
  try {
    if (isGeminiCoolingDown()) {
      return {
        status: "temporary-failure",
        reason: geminiCooldownReason || "gemini_cooldown_active",
      };
    }

    const model = getGeminiModel();
    const result = await model.generateContent(
      buildPrompt(title, productUrl, currentCategorySlug),
    );
    const response = result.response;
    let text = response.text().trim();

    if (text.startsWith("```")) {
      text = text.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    const parsed = JSON.parse(text) as {
      cleanTitle?: string;
      brand?: string | null;
      suggestedCategory?: string | null;
    };

    const cleanTitle = createHeuristicCleanTitle(parsed.cleanTitle || title);
    const suggestedCategory = normalizeSuggestedCategory(
      parsed.suggestedCategory,
    );

    return {
      status: "success",
      classification: {
        cleanTitle,
        brand: parsed.brand?.trim() || null,
        suggestedCategory,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    if (error instanceof GoogleGenerativeAIFetchError) {
      const status = error.status ?? 0;
      const isQuotaError =
        status === 429 &&
        /quota|resource_exhausted|daily|per day|exhausted/.test(message);
      const isRateLimitError = status === 429 && !isQuotaError;
      const isServerError = status >= 500 || status === 408;

      if (isQuotaError || isRateLimitError || isServerError) {
        const reason = isQuotaError
          ? "gemini_quota_exhausted"
          : isRateLimitError
            ? "gemini_rate_limited"
            : "gemini_server_error";
        const cooldownMs = isQuotaError
          ? QUOTA_COOLDOWN_MS
          : isRateLimitError
            ? RATE_LIMIT_COOLDOWN_MS
            : SERVER_ERROR_COOLDOWN_MS;

        activateGeminiCooldown(cooldownMs, reason);
        logger.warn(
          {
            error,
            model: MODEL_NAME,
            title,
            productUrl,
            reason,
            cooldownMs,
          },
          "Gemini temporarily unavailable for title classification",
        );
        return {
          status: "temporary-failure",
          reason,
        };
      }
    }

    if (
      error instanceof GoogleGenerativeAIAbortError ||
      /timeout|timed out|econnreset|network|unavailable|temporarily unavailable/.test(
        message,
      )
    ) {
      activateGeminiCooldown(SERVER_ERROR_COOLDOWN_MS, "gemini_transient_error");
      logger.warn(
        {
          error,
          model: MODEL_NAME,
          title,
          productUrl,
          cooldownMs: SERVER_ERROR_COOLDOWN_MS,
        },
        "Gemini transient error during title classification",
      );
      return {
        status: "temporary-failure",
        reason: "gemini_transient_error",
      };
    }

    logger.error(
      { error, model: MODEL_NAME, title, productUrl },
      "Failed to classify deal title with Gemini",
    );
    return {
      status: "permanent-failure",
      reason: "gemini_classification_failed",
    };
  }
}

export async function processUnclassifiedDeals(
  limit: number = MANUAL_BATCH_SIZE,
  options: ProcessUnclassifiedDealsOptions = {},
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    processed: 0,
    failed: 0,
    skipped: 0,
    categoriesUpdated: 0,
    deferred: 0,
  };

  const { oldestFirst = false } = options;

  const deals = await prisma.deal.findMany({
    where: {
      titleProcessedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      productUrl: true,
      brand: true,
      categoryId: true,
      category: {
        select: {
          slug: true,
        },
      },
    },
    take: limit,
    orderBy: {
      createdAt: oldestFirst ? "asc" : "desc",
    },
  });

  if (deals.length === 0) {
    logger.info("No unprocessed deals found for title classification");
    return result;
  }

  if (isGeminiCoolingDown()) {
    result.deferred = deals.length;
    logger.warn(
      {
        count: deals.length,
        remainingCooldownMs: getCooldownRemainingMs(),
        reason: geminiCooldownReason,
      },
      "Skipping title classification batch because Gemini is cooling down",
    );
    return result;
  }

  logger.info(
    { count: deals.length, oldestFirst },
    "Processing deals for title classification",
  );

  const categories = await prisma.category.findMany({
    select: { id: true, slug: true },
  });
  const categoryMap = new Map(categories.map((category) => [category.slug, category.id]));

  for (const deal of deals) {
    const heuristicTitle = createHeuristicCleanTitle(deal.title);
    const shouldUseAi = shouldUseAiClassification(
      deal.title,
      deal.productUrl,
      deal.category.slug,
    );

    if (!shouldUseAi) {
      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          cleanTitle: heuristicTitle,
          titleProcessedAt: new Date(),
        },
      });
      result.skipped++;
      continue;
    }

    const classification = await classifyDeal(
      deal.title,
      deal.productUrl,
      deal.category.slug,
    );

    if (classification.status === "success") {
      const nextClassification = classification.classification;
      const updateData: {
        cleanTitle: string;
        brand: string | null;
        titleProcessedAt: Date;
        categoryId?: string;
      } = {
        cleanTitle: nextClassification.cleanTitle,
        brand: nextClassification.brand ?? deal.brand ?? null,
        titleProcessedAt: new Date(),
      };

      if (
        nextClassification.suggestedCategory &&
        nextClassification.suggestedCategory !== deal.category.slug
      ) {
        const newCategoryId = categoryMap.get(nextClassification.suggestedCategory);
        if (newCategoryId) {
          updateData.categoryId = newCategoryId;
          result.categoriesUpdated++;
        }
      }

      await prisma.deal.update({
        where: { id: deal.id },
        data: updateData,
      });

      result.processed++;
      logger.debug(
        {
          dealId: deal.id,
          originalTitle: deal.title,
          cleanTitle: nextClassification.cleanTitle,
          brand: nextClassification.brand,
          suggestedCategory: nextClassification.suggestedCategory,
        },
        "Deal title classified",
      );
    } else if (classification.status === "temporary-failure") {
      result.deferred = deals.length - result.processed - result.failed - result.skipped;
      logger.warn(
        {
          reason: classification.reason,
          deferred: result.deferred,
          dealId: deal.id,
        },
        "Deferring remaining title classifications because Gemini is temporarily unavailable",
      );
      break;
    } else {
      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          cleanTitle: heuristicTitle,
          titleProcessedAt: new Date(),
        },
      });
      result.failed++;
    }

    await sleep(REQUEST_DELAY_MS);
  }

  logger.info(result, "Title classification batch completed");
  return result;
}

export async function processAllUnclassifiedDeals(): Promise<ProcessingResult> {
  const totalResult: ProcessingResult = {
    processed: 0,
    failed: 0,
    skipped: 0,
    categoriesUpdated: 0,
    deferred: 0,
  };

  let hasMore = true;

  while (hasMore) {
    const batchResult = await processUnclassifiedDeals(MANUAL_BATCH_SIZE, {
      oldestFirst: true,
    });

    totalResult.processed += batchResult.processed;
    totalResult.failed += batchResult.failed;
    totalResult.skipped += batchResult.skipped;
    totalResult.categoriesUpdated += batchResult.categoriesUpdated;
    totalResult.deferred += batchResult.deferred;

    hasMore =
      batchResult.processed + batchResult.failed + batchResult.skipped ===
      MANUAL_BATCH_SIZE;

    if (batchResult.deferred > 0) {
      break;
    }

    if (hasMore) {
      await sleep(1000);
    }
  }

  logger.info(totalResult, "All title classification completed");
  return totalResult;
}

async function runScheduledBatch(
  batchSize: number,
  label: "incremental" | "backfill",
  oldestFirst: boolean,
) {
  if (isInProcessRunActive) {
    logger.warn({ label }, "Skipping in-process title classifier run because another batch is active");
    return;
  }

  isInProcessRunActive = true;
  try {
    const result = await processUnclassifiedDeals(batchSize, { oldestFirst });
    logger.info({ label, result }, "In-process title classification run completed");
  } catch (error) {
    logger.error({ error, label }, "In-process title classification run failed");
  } finally {
    isInProcessRunActive = false;
  }
}

export function startTitleClassifierScheduler() {
  if (!GEMINI_API_KEY) {
    logger.warn("GEMINI_API_KEY is not configured; title classifier scheduler not started");
    return;
  }

  if (inProcessIncrementalTask || inProcessBackfillTask) {
    return;
  }

  inProcessIncrementalTask = cron.schedule(
    SCRAPE_INTERVALS.TITLE_CLASSIFIER_INCREMENTAL,
    () => {
      void runScheduledBatch(INCREMENTAL_BATCH_SIZE, "incremental", false);
    },
    { timezone: CLASSIFIER_TIMEZONE },
  );

  inProcessBackfillTask = cron.schedule(
    SCRAPE_INTERVALS.TITLE_CLASSIFIER_BACKFILL,
    () => {
      void runScheduledBatch(BACKFILL_BATCH_SIZE, "backfill", true);
    },
    { timezone: CLASSIFIER_TIMEZONE },
  );

  logger.info(
    {
      model: MODEL_NAME,
      timezone: CLASSIFIER_TIMEZONE,
      incrementalBatchSize: INCREMENTAL_BATCH_SIZE,
      backfillBatchSize: BACKFILL_BATCH_SIZE,
    },
    "Started in-process title classifier scheduler",
  );
}

export function stopTitleClassifierScheduler() {
  inProcessIncrementalTask?.stop();
  inProcessBackfillTask?.stop();
  inProcessIncrementalTask = null;
  inProcessBackfillTask = null;
}

export default {
  processUnclassifiedDeals,
  processAllUnclassifiedDeals,
  startTitleClassifierScheduler,
  stopTitleClassifierScheduler,
  classifyDeal,
};
