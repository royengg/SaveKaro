import prisma from "../lib/prisma";
import logger from "../lib/logger";

const DEFAULT_CATEGORIES = [
  { name: "Electronics", slug: "electronics", color: "#3B82F6" },
  { name: "Fashion", slug: "fashion", color: "#EC4899" },
  { name: "Gaming", slug: "gaming", color: "#8B5CF6" },
  { name: "Home & Kitchen", slug: "home-kitchen", color: "#F59E0B" },
  { name: "Beauty", slug: "beauty", color: "#F472B6" },
  { name: "Food & Groceries", slug: "food-groceries", color: "#10B981" },
  {
    name: "Mobile & Accessories",
    slug: "mobile-accessories",
    color: "#6366F1",
  },
  { name: "Books & Stationery", slug: "books-stationery", color: "#84CC16" },
  { name: "Travel", slug: "travel", color: "#0EA5E9" },
  { name: "Other", slug: "other", color: "#6B7280" },
];

/**
 * Ensure default categories exist in the database.
 * Run this on application startup.
 */
export async function ensureDefaultCategories() {
  try {
    const count = await prisma.category.count();

    // Only run if categories are missing to avoid unnecessary DB calls (though upsert is safe)
    if (count < DEFAULT_CATEGORIES.length) {
      logger.info("Initializing default categories...");

      for (const category of DEFAULT_CATEGORIES) {
        await prisma.category.upsert({
          where: { slug: category.slug },
          update: {}, // Don't overwrite if exists
          create: category,
        });
      }

      logger.info(`Validated ${DEFAULT_CATEGORIES.length} default categories`);
    }
  } catch (error) {
    logger.error({ error }, "Failed to ensure default categories");
  }
}
