import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { DealRegion, Prisma } from "@prisma/client";
import { ParsedDeal } from "./reddit/parser";
import { resolveAmazonProductUrl } from "./amazon-url-service";
import { getCanonicalStoreKey } from "../lib/store-key";

export interface DealSaveResult {
  savedCount: number;
  skippedCount: number;
  errorCount: number;
}

const SHORTENER_DOMAINS = [
  "amzn.to",
  "amzn.com",
  "amzn.in",
  "amzn.co.uk",
  "amzn.de",
  "amzn.ca",
  "amzn.com.au",
  "bit.ly",
  "tinyurl.com",
  "rb.gy",
  "myntr.in",
  "myntr.it",
  "ajio.co",
  "ajio.me",
  "ajiio.in",
  "ajiio.co",
  "ajiio.me",
  "bitli.in",
  "bittli.in",
];

const TRACKING_QUERY_PARAM_PREFIXES = ["utm_"];

const TRACKING_QUERY_PARAMS = new Set([
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_",
  "tag",
  "affid",
  "aff_id",
  "aff_source",
  "affiliate",
  "source",
]);

const PRODUCT_QUERY_PARAM_ALLOWLIST = new Set([
  "id",
  "pid",
  "sku",
  "asin",
  "item",
  "itemid",
  "product",
  "productid",
  "variant",
  "model",
]);

const DUPLICATE_LOOKBACK_DAYS = 45;
const TITLE_DUPLICATE_MIN_LENGTH = 18;
const DESCRIPTION_URL_PATTERN = /(?<!\()https?:\/\/[^\s\)\]<>]+/g;

type DuplicateComparableDeal = {
  id: string;
  title: string;
  cleanTitle: string | null;
  productUrl: string;
  store: string | null;
  storeKey: string | null;
  currency: string;
  redditPostId: string | null;
  source: DealRegion | "USER_SUBMITTED" | "REDDIT";
  imageUrl: string | null;
  description?: string | null;
  redditScore?: number;
};

function normalizeHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^(www|m)\./i, "").toLowerCase();
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

function normalizePathname(pathname: string): string {
  const normalized = pathname.replace(/\/{2,}/g, "/").replace(/\/+$/g, "");
  return normalized || "/";
}

function normalizeComparableUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^(www|m)\./i, "").toLowerCase();
    let pathname = normalizePathname(parsed.pathname);

    if (isRedditUrl(url)) {
      return `reddit:${pathname}`;
    }

    if (/amazon\./i.test(host)) {
      const amazonMatch = pathname.match(
        /\/(?:gp\/product|dp|exec\/obidos\/ASIN)\/([A-Z0-9]{10})/i,
      );
      if (amazonMatch) {
        pathname = `/dp/${amazonMatch[1].toUpperCase()}`;
      }
      return `${host}${pathname}`;
    }

    const keptEntries = Array.from(parsed.searchParams.entries())
      .filter(([key, value]) => {
        const normalizedKey = key.trim().toLowerCase();
        if (!normalizedKey || !value.trim()) return false;
        if (
          TRACKING_QUERY_PARAMS.has(normalizedKey) ||
          TRACKING_QUERY_PARAM_PREFIXES.some((prefix) =>
            normalizedKey.startsWith(prefix),
          )
        ) {
          return false;
        }
        return PRODUCT_QUERY_PARAM_ALLOWLIST.has(normalizedKey);
      })
      .map(
        ([key, value]) =>
          [key.trim().toLowerCase(), value.trim().toLowerCase()] as const,
      )
      .sort(([a], [b]) => a.localeCompare(b));

    const normalizedQuery = keptEntries.length
      ? `?${new URLSearchParams(keptEntries as [string, string][]).toString()}`
      : "";

    return `${host}${pathname}${normalizedQuery}`;
  } catch {
    return null;
  }
}

function normalizeComparableTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[₹$€£]\s*\d[\d,]*(?:\.\d+)?/g, " ")
    .replace(/\b(?:rs|inr|usd|eur|gbp|cad|aud)\b/g, " ")
    .replace(/\b\d{1,3}\s*%\s*off\b/g, " ")
    .replace(
      /\b(?:upto|up to|flat|extra|starting from|from|deal|sale|offer|offers|coupon|code|mrp|price|drop)\b/g,
      " ",
    )
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function areDealsEquivalent(
  existingDeal: Pick<
    DuplicateComparableDeal,
    "title" | "cleanTitle" | "productUrl" | "store" | "storeKey"
  >,
  incomingDeal: {
    title: string;
    productUrl: string;
    store: string | null;
  },
): boolean {
  const existingUrl = normalizeComparableUrl(existingDeal.productUrl);
  const incomingUrl = normalizeComparableUrl(incomingDeal.productUrl);

  if (
    existingUrl &&
    incomingUrl &&
    !existingUrl.startsWith("reddit:") &&
    existingUrl === incomingUrl
  ) {
    return true;
  }

  const existingStore =
    existingDeal.storeKey ||
    getCanonicalStoreKey({
      store: existingDeal.store,
      productUrl: existingDeal.productUrl,
    });
  const incomingStore = getCanonicalStoreKey({
    store: incomingDeal.store,
    productUrl: incomingDeal.productUrl,
  });

  if (!existingStore || !incomingStore || existingStore !== incomingStore) {
    return false;
  }

  const existingTitle = normalizeComparableTitle(
    existingDeal.cleanTitle || existingDeal.title,
  );
  const nextTitle = normalizeComparableTitle(incomingDeal.title);

  return (
    existingTitle.length >= TITLE_DUPLICATE_MIN_LENGTH &&
    existingTitle === nextTitle
  );
}

function shouldUpgradeProductUrl(
  existingUrl: string,
  nextUrl: string,
): boolean {
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

  const existingComparableUrl = normalizeComparableUrl(existingUrl);
  const nextComparableUrl = normalizeComparableUrl(nextUrl);
  if (
    existingComparableUrl &&
    nextComparableUrl &&
    existingComparableUrl === nextComparableUrl
  ) {
    return false;
  }

  return false;
}

function extractExternalDescriptionUrls(description: string | null | undefined): string[] {
  if (!description) return [];

  return (description.match(DESCRIPTION_URL_PATTERN) || [])
    .map((url) => url.trim().replace(/[)\],.!?;:]+$/g, ""))
    .filter((url) => url.length > 0)
    .filter((url) => !isRedditUrl(url))
    .slice(0, 6);
}

function getDefaultCurrencyForRegion(region: DealRegion): string {
  switch (region) {
    case "INDIA":
      return "INR";
    case "CANADA":
      return "CAD";
    case "WORLD":
    default:
      return "USD";
  }
}

function normalizeScrapedCurrencyForRegion(
  currency: string | null | undefined,
  region: DealRegion,
): string {
  if (region === "CANADA" && (!currency || currency === "USD")) {
    return "CAD";
  }

  return currency || getDefaultCurrencyForRegion(region);
}

export class DealManager {
  static async findRecentDuplicateDeal(
    deal: {
      title: string;
      productUrl: string;
      store?: string | null;
    },
    region: DealRegion,
  ) {
    const cutoffDate = new Date(
      Date.now() - DUPLICATE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );
    const normalizedStoreKey = getCanonicalStoreKey({
      store: deal.store,
      productUrl: deal.productUrl,
    });

    const recentDeals = await prisma.deal.findMany({
      where: {
        region,
        isActive: true,
        createdAt: { gte: cutoffDate },
        ...(normalizedStoreKey
          ? {
              OR: [{ storeKey: normalizedStoreKey }, { storeKey: null }],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: normalizedStoreKey ? 80 : 140,
      select: {
        id: true,
        title: true,
        cleanTitle: true,
        productUrl: true,
        store: true,
        storeKey: true,
        currency: true,
        redditPostId: true,
        imageUrl: true,
        description: true,
        redditScore: true,
        source: true,
      },
    });

    return (
      recentDeals.find((existingDeal) =>
        areDealsEquivalent(existingDeal, {
          title: deal.title,
          productUrl: deal.productUrl,
          store: deal.store ?? null,
        }),
      ) ?? null
    );
  }

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
    source: string,
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
      logger.error(
        { error, dealId, newPrice, source },
        "Failed to update price history",
      );
      return false;
    }
  }

  /**
   * Save multiple deals to database with proper error handling
   * Consolidates the duplicate logic from scheduler.ts and queues.ts
   */
  static async saveDeals(
    deals: ParsedDeal[],
    region: DealRegion = "INDIA",
  ): Promise<DealSaveResult> {
    const result: DealSaveResult = {
      savedCount: 0,
      skippedCount: 0,
      errorCount: 0,
    };

    for (const deal of deals) {
      try {
        deal.productUrl = await resolveAmazonProductUrl(deal.productUrl);
        deal.currency = normalizeScrapedCurrencyForRegion(deal.currency, region);

        const externalDescriptionUrls = extractExternalDescriptionUrls(
          deal.description,
        );

        if (isRedditUrl(deal.productUrl) && externalDescriptionUrls.length > 0) {
          logger.warn(
            {
              redditPostId: deal.redditPostId,
              title: deal.title,
              incomingProductUrl: deal.productUrl,
              externalDescriptionUrls,
            },
            "Incoming scraped deal kept a Reddit URL despite external links in description",
          );
        }

        // Get category with fallback to "other"
        const category = await this.getCategoryBySlug(deal.categorySlug);

        if (!category) {
          logger.warn(
            { categorySlug: deal.categorySlug },
            "Category not found, skipping deal",
          );
          result.skippedCount++;
          continue;
        }

        const existingDeal = await prisma.deal.findUnique({
          where: { redditPostId: deal.redditPostId },
          select: {
            id: true,
            title: true,
            cleanTitle: true,
            productUrl: true,
            store: true,
            storeKey: true,
            currency: true,
            imageUrl: true,
            description: true,
            redditScore: true,
            redditPostId: true,
            source: true,
          },
        });

        const duplicateDeal =
          !existingDeal &&
          (await this.findRecentDuplicateDeal(
            {
              title: deal.title,
              productUrl: deal.productUrl,
              store: deal.store,
            },
            region,
          ));

        if (duplicateDeal) {
          const duplicateUpdateData: Prisma.DealUpdateInput = {
            redditScore: Math.max(
              duplicateDeal.redditScore ?? 0,
              deal.redditScore,
            ),
          };
          let shouldReprocessTitle = false;
          const shouldUpgradeDuplicateUrl = shouldUpgradeProductUrl(
            duplicateDeal.productUrl,
            deal.productUrl,
          );
          const nextDuplicateProductUrl = shouldUpgradeDuplicateUrl
            ? deal.productUrl
            : duplicateDeal.productUrl;
          const nextDuplicateStore = deal.store ?? duplicateDeal.store;

          if (shouldUpgradeDuplicateUrl) {
            duplicateUpdateData.productUrl = deal.productUrl;
            shouldReprocessTitle = true;
          }

          if (!duplicateDeal.store && deal.store) {
            duplicateUpdateData.store = deal.store;
            shouldReprocessTitle = true;
          }

          const nextDuplicateStoreKey = getCanonicalStoreKey({
            store: nextDuplicateStore,
            productUrl: nextDuplicateProductUrl,
          });
          if (duplicateDeal.storeKey !== nextDuplicateStoreKey) {
            duplicateUpdateData.storeKey = nextDuplicateStoreKey;
          }

          if (!duplicateDeal.imageUrl && deal.imageUrl) {
            duplicateUpdateData.imageUrl = deal.imageUrl;
          }

          if (!duplicateDeal.description && deal.description) {
            duplicateUpdateData.description = deal.description;
          }

          if (duplicateDeal.currency !== deal.currency) {
            duplicateUpdateData.currency = deal.currency;
          }

          if (shouldReprocessTitle) {
            duplicateUpdateData.cleanTitle = null;
            duplicateUpdateData.brand = null;
            duplicateUpdateData.titleProcessedAt = null;
          }

          await prisma.deal.update({
            where: { id: duplicateDeal.id },
            data: duplicateUpdateData,
          });

          if (deal.dealPrice) {
            await this.updatePriceHistory(
              duplicateDeal.id,
              deal.dealPrice,
              "reddit_scrape",
            );
          }

          logger.info(
            {
              incomingRedditPostId: deal.redditPostId,
              duplicateDealId: duplicateDeal.id,
              duplicateSource: duplicateDeal.source,
            },
            "Skipped creating duplicate deal and merged scrape data into existing record",
          );
          result.skippedCount++;
          continue;
        }

        const updateData: Prisma.DealUpdateInput = {
          title: deal.title,
          description: deal.description,
          redditScore: deal.redditScore,
          // Don't update prices to preserve history.
        };
        let shouldReprocessTitle = false;

        if (existingDeal && existingDeal.title !== deal.title) {
          shouldReprocessTitle = true;
        }

        const shouldUpgradeUrl = existingDeal
          ? shouldUpgradeProductUrl(existingDeal.productUrl, deal.productUrl)
          : false;

        if (!existingDeal || shouldUpgradeUrl) {
          updateData.productUrl = deal.productUrl;
          if (existingDeal && shouldUpgradeUrl) {
            shouldReprocessTitle = true;
          }
          if (deal.store) {
            if (existingDeal && existingDeal.store !== deal.store) {
              shouldReprocessTitle = true;
            }
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
          shouldReprocessTitle = true;
        }

        if ((!existingDeal || !existingDeal.imageUrl) && deal.imageUrl) {
          updateData.imageUrl = deal.imageUrl;
        }

        if (!existingDeal || existingDeal.currency !== deal.currency) {
          updateData.currency = deal.currency;
        }

        const nextStoreKey = getCanonicalStoreKey({
          store: deal.store ?? existingDeal?.store ?? null,
          productUrl:
            !existingDeal || shouldUpgradeUrl
              ? deal.productUrl
              : existingDeal.productUrl,
        });
        if (!existingDeal || existingDeal.storeKey !== nextStoreKey) {
          updateData.storeKey = nextStoreKey;
        }

        if (existingDeal && shouldReprocessTitle) {
          updateData.cleanTitle = null;
          updateData.brand = null;
          updateData.titleProcessedAt = null;
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
            storeKey: getCanonicalStoreKey({
              store: deal.store,
              productUrl: deal.productUrl,
            }),
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
      region: DealRegion;
    },
    userId: string,
  ) {
    const currency = getDefaultCurrencyForRegion(dealData.region);
    const resolvedProductUrl = await resolveAmazonProductUrl(
      dealData.productUrl,
    );
    const normalizedDealData = {
      ...dealData,
      productUrl: resolvedProductUrl,
    };

    const duplicateDeal = await this.findRecentDuplicateDeal(
      {
        title: normalizedDealData.title,
        productUrl: normalizedDealData.productUrl,
        store: normalizedDealData.store ?? null,
      },
      normalizedDealData.region,
    );

    if (duplicateDeal) {
      return {
        deal: await prisma.deal.findUniqueOrThrow({
          where: { id: duplicateDeal.id },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                icon: true,
                color: true,
              },
            },
            submittedBy: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        }),
        created: false,
      };
    }

    const deal = await prisma.deal.create({
      data: {
        ...normalizedDealData,
        storeKey: getCanonicalStoreKey({
          store: normalizedDealData.store,
          productUrl: normalizedDealData.productUrl,
        }),
        source: "USER_SUBMITTED",
        currency,
        submittedById: userId,
        originalPrice: normalizedDealData.originalPrice || null,
        dealPrice: normalizedDealData.dealPrice || null,
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
    if (normalizedDealData.dealPrice) {
      await this.updatePriceHistory(
        deal.id,
        normalizedDealData.dealPrice,
        "user_submission",
      );
    }

    return { deal, created: true };
  }
}
