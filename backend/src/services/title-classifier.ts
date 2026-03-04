import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../lib/prisma";
import logger from "../lib/logger";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BATCH_SIZE = 20;
const MODEL_NAME = "gemini-2.0-flash";

interface TitleClassification {
  cleanTitle: string;
  brand: string | null;
  suggestedCategory: string | null;
}

interface ProcessingResult {
  processed: number;
  failed: number;
  skipped: number;
  categoriesUpdated: number;
}

const VALID_CATEGORIES = [
  "electronics",
  "fashion",
  "home",
  "beauty",
  "sports",
  "books",
  "gaming",
  "grocery",
  "baby",
  "automotive",
  "health",
  "toys",
  "office",
  "travel",
  "other",
] as const;

function getGeminiClient() {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(GEMINI_API_KEY);
}

function buildPrompt(title: string, productUrl: string): string {
  return `You are a product classifier for an e-commerce deals platform. Analyze the product title and URL to extract key information.

Product Title: "${title}"
Product URL: ${productUrl}

Instructions:

1. cleanTitle: Create a concise, readable title (max 80 characters). Remove:
   - SKU codes, model numbers, random alphanumeric strings
   - Excessive SEO keywords and repetition
   - Store-specific prefixes like "[Deal]" or "(Limited Time)"
   - Redundant specifications that don't add value
   Keep: Brand name, product type, essential attributes (color, size if important)

2. brand: Extract the brand name if clearly identifiable from the title or URL. Return null if unclear or generic.

3. suggestedCategory: Based on the product type, suggest ONE category from this list:
   ${VALID_CATEGORIES.join(", ")}
   
   Use the URL domain and path to help identify the product type:
   - amazon.in/dp/... electronics section -> "electronics"
   - flipkart.com/mobiles/... -> "electronics"
   - myntra.com, ajio.com -> likely "fashion"
   - nykaa.com -> "beauty"
   - etc.
   
   Return null if you cannot determine a suitable category.

Respond with ONLY valid JSON, no markdown or code blocks:
{"cleanTitle": "...", "brand": "..." or null, "suggestedCategory": "..." or null}`;
}

async function classifyDeal(
  title: string,
  productUrl: string
): Promise<TitleClassification | null> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const result = await model.generateContent(buildPrompt(title, productUrl));
    const response = result.response;
    let text = response.text().trim();

    // Remove markdown code blocks if present
    if (text.startsWith("```")) {
      text = text.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    const parsed = JSON.parse(text) as TitleClassification;

    if (!parsed.cleanTitle || typeof parsed.cleanTitle !== "string") {
      throw new Error("Invalid cleanTitle in response");
    }

    if (parsed.cleanTitle.length > 100) {
      parsed.cleanTitle = parsed.cleanTitle.substring(0, 97) + "...";
    }

    // Validate category
    const validCategory =
      parsed.suggestedCategory &&
      VALID_CATEGORIES.includes(
        parsed.suggestedCategory.toLowerCase() as (typeof VALID_CATEGORIES)[number]
      )
        ? parsed.suggestedCategory.toLowerCase()
        : null;

    return {
      cleanTitle: parsed.cleanTitle.trim(),
      brand: parsed.brand?.trim() || null,
      suggestedCategory: validCategory,
    };
  } catch (error) {
    logger.error({ error, title, productUrl }, "Failed to classify deal");
    return null;
  }
}

export async function processUnclassifiedDeals(
  limit: number = BATCH_SIZE
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    processed: 0,
    failed: 0,
    skipped: 0,
    categoriesUpdated: 0,
  };

  const deals = await prisma.deal.findMany({
    where: {
      titleProcessedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      productUrl: true,
      categoryId: true,
      category: {
        select: {
          slug: true,
        },
      },
    },
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
  });

  if (deals.length === 0) {
    logger.info("No unprocessed deals found");
    return result;
  }

  logger.info(
    { count: deals.length },
    "Processing deals for title classification"
  );

  // Pre-fetch all categories for quick lookup
  const categories = await prisma.category.findMany({
    select: { id: true, slug: true },
  });
  const categoryMap = new Map(categories.map((c) => [c.slug, c.id]));

  for (const deal of deals) {
    // Skip if title is already short and clean-looking
    if (
      deal.title.length <= 60 &&
      !deal.title.includes("[") &&
      !deal.title.includes("(")
    ) {
      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          cleanTitle: deal.title,
          titleProcessedAt: new Date(),
        },
      });
      result.skipped++;
      continue;
    }

    const classification = await classifyDeal(deal.title, deal.productUrl);

    if (classification) {
      const updateData: {
        cleanTitle: string;
        brand: string | null;
        titleProcessedAt: Date;
        categoryId?: string;
      } = {
        cleanTitle: classification.cleanTitle,
        brand: classification.brand,
        titleProcessedAt: new Date(),
      };

      // Update category if AI suggested a different one and it exists
      if (
        classification.suggestedCategory &&
        classification.suggestedCategory !== deal.category.slug
      ) {
        const newCategoryId = categoryMap.get(classification.suggestedCategory);
        if (newCategoryId) {
          updateData.categoryId = newCategoryId;
          result.categoriesUpdated++;

          logger.debug(
            {
              dealId: deal.id,
              oldCategory: deal.category.slug,
              newCategory: classification.suggestedCategory,
            },
            "Category updated"
          );
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
          original: deal.title,
          clean: classification.cleanTitle,
          brand: classification.brand,
          category: classification.suggestedCategory,
        },
        "Deal classified"
      );
    } else {
      await prisma.deal.update({
        where: { id: deal.id },
        data: {
          titleProcessedAt: new Date(),
        },
      });
      result.failed++;
    }

    // Delay between API calls to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 4000));
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
  };

  let hasMore = true;

  while (hasMore) {
    const batchResult = await processUnclassifiedDeals(BATCH_SIZE);

    totalResult.processed += batchResult.processed;
    totalResult.failed += batchResult.failed;
    totalResult.skipped += batchResult.skipped;
    totalResult.categoriesUpdated += batchResult.categoriesUpdated;

    hasMore =
      batchResult.processed + batchResult.failed + batchResult.skipped ===
      BATCH_SIZE;

    if (hasMore) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  logger.info(totalResult, "All title classification completed");
  return totalResult;
}

export default {
  processUnclassifiedDeals,
  processAllUnclassifiedDeals,
  classifyDeal,
};
