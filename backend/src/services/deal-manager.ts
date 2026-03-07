/**
 * Centralized deal management service
 * Consolidates deal saving, category lookup, and price history logic
 */

import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { DealRegion } from "@prisma/client";
import { ParsedDeal } from "./reddit/parser";

export interface DealSaveResult {
  savedCount: number;
  skippedCount: number;
  errorCount: number;
}

export class DealManager {
  /**
   * Get category by slug with fallback to "other"
   * Centralized category lookup logic used across the app
   */
  static async getCategoryBySlug(slug: string) {
    let category = await prisma.category.findUnique({
      where: { slug },
    });

    if (!category) {
      category = await prisma.category.findUnique({
        where: { slug: "other" },
      });
    }

    return category;
  }

  /**
   * Update price history for a deal if price has changed
   */
  static async updatePriceHistory(
    dealId: string,
    newPrice: number,
    source: string
  ): Promise<boolean> {
    try {
      // Check if price changed from last recorded price
      const lastPrice = await prisma.priceHistory.findFirst({
        where: { dealId },
        orderBy: { createdAt: "desc" },
      });

      if (!lastPrice || Number(lastPrice.price) !== newPrice) {
        await prisma.priceHistory.create({
          data: {
            dealId,
            price: newPrice,
            source,
          },
        });
        return true; // Price was updated
      }
      return false; // No change
    } catch (error) {
      logger.error({ error, dealId, newPrice, source }, "Failed to update price history");
      return false;
    }
  }

  /**
   * Save multiple deals to database with proper error handling
   * Consolidates the duplicate logic from scheduler.ts and queues.ts
   */
  static async saveDeals(
    deals: ParsedDeal[],
    region: DealRegion = "INDIA"
  ): Promise<DealSaveResult> {
    const result: DealSaveResult = {
      savedCount: 0,
      skippedCount: 0,
      errorCount: 0,
    };

    for (const deal of deals) {
      try {
        // Get category with fallback to "other"
        const category = await this.getCategoryBySlug(deal.categorySlug);

        if (!category) {
          logger.warn(
            { categorySlug: deal.categorySlug },
            "Category not found, skipping deal"
          );
          result.skippedCount++;
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
            await this.updatePriceHistory(
              existingDeal.id,
              deal.dealPrice,
              "reddit_scrape"
            );
          }
        }

        result.savedCount++;
      } catch (error) {
        // Ignore duplicate errors, log others
        if (
          error instanceof Error &&
          !error.message.includes("Unique constraint")
        ) {
          logger.error({ error, deal: deal.title }, "Failed to save deal");
          result.errorCount++;
        } else {
          // Duplicate - count as skipped
          result.skippedCount++;
        }
      }
    }

    logger.info(result, "Deal save operation completed");
    return result;
  }

  /**
   * Save a single user-submitted deal
   */
  static async saveUserDeal(
    dealData: {
      title: string;
      description?: string;
      originalPrice?: number;
      dealPrice?: number;
      discountPercent?: number;
      productUrl: string;
      imageUrl?: string;
      store?: string;
      categoryId: string;
    },
    userId: string
  ) {
    const deal = await prisma.deal.create({
      data: {
        ...dealData,
        source: "USER_SUBMITTED",
        submittedById: userId,
        originalPrice: dealData.originalPrice || null,
        dealPrice: dealData.dealPrice || null,
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true, icon: true, color: true },
        },
        submittedBy: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    // Add initial price to history if dealPrice is provided
    if (dealData.dealPrice) {
      await this.updatePriceHistory(
        deal.id,
        dealData.dealPrice,
        "user_submission"
      );
    }

    return deal;
  }
}