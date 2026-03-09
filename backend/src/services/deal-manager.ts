/**
 * Centralized deal management service
 * Consolidates deal saving, category lookup, and price history logic
 */

import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { DealRegion, Prisma } from "@prisma/client";
import { ParsedDeal } from "./reddit/parser";

export interface DealSaveResult {
  savedCount: number;
  skippedCount: number;
  errorCount: number;
}

const SHORTENER_DOMAINS = [
  "amzn.to",
  "bit.ly",
  "tinyurl.com",
  "rb.gy",
  "myntr.in",
  "myntr.it",
  "ajiio.in",
  "bittli.in",
];

function normalizeHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function isRedditUrl(url: string): boolean {
  const host = normalizeHost(url);
  if (!host) return false;
  return (
    host === "reddit.com" || host.endsWith(".reddit.com") || host === "redd.it"
  );
}

function isShortenerUrl(url: string): boolean {
  const host = normalizeHost(url);
  if (!host) return false;
  return SHORTENER_DOMAINS.some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
}

function isLandingPageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.pathname === "/" || parsed.pathname === "") &&
      !parsed.search &&
      !parsed.hash
    );
  } catch {
    return false;
  }
}

function shouldUpgradeProductUrl(existingUrl: string, nextUrl: string): boolean {
  if (!nextUrl || existingUrl === nextUrl) {
    return false;
  }

  const existingIsReddit = isRedditUrl(existingUrl);
  const nextIsReddit = isRedditUrl(nextUrl);
  if (existingIsReddit !== nextIsReddit) {
    return existingIsReddit && !nextIsReddit;
  }

  if (isShortenerUrl(existingUrl) && !isShortenerUrl(nextUrl)) {
    return true;
  }

  if (isLandingPageUrl(existingUrl) && !isLandingPageUrl(nextUrl)) {
    return true;
  }

  return false;
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

        const existingDeal = await prisma.deal.findUnique({
          where: { redditPostId: deal.redditPostId },
          select: {
            id: true,
            productUrl: true,
            store: true,
            imageUrl: true,
          },
        });

        const updateData: Prisma.DealUpdateInput = {
          title: deal.title,
          description: deal.description,
          redditScore: deal.redditScore,
          // Don't update prices to preserve history.
        };

        const shouldUpgradeUrl = existingDeal
          ? shouldUpgradeProductUrl(existingDeal.productUrl, deal.productUrl)
          : false;

        if (!existingDeal || shouldUpgradeUrl) {
          updateData.productUrl = deal.productUrl;
          if (deal.store) {
            updateData.store = deal.store;
          }
          if (existingDeal && shouldUpgradeUrl) {
            logger.info(
              {
                redditPostId: deal.redditPostId,
                previousUrl: existingDeal.productUrl,
                upgradedUrl: deal.productUrl,
              },
              "Upgraded deal product URL from newer scrape data",
            );
          }
        } else if (!existingDeal.store && deal.store) {
          updateData.store = deal.store;
        }

        if ((!existingDeal || !existingDeal.imageUrl) && deal.imageUrl) {
          updateData.imageUrl = deal.imageUrl;
        }

        const upsertedDeal = await prisma.deal.upsert({
          where: { redditPostId: deal.redditPostId },
          update: updateData,
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
          select: { id: true },
        });

        // Add price history entry if dealPrice exists
        if (deal.dealPrice) {
          await this.updatePriceHistory(
            upsertedDeal.id,
            deal.dealPrice,
            "reddit_scrape",
          );
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
