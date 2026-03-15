import prisma from "../lib/prisma";
import logger from "../lib/logger";
import { sendEmail, generatePriceAlertEmail } from "./notification/email";
import type { Deal, Category } from "@prisma/client";
import { normalizeWatchedProductUrl } from "../lib/price-alert-watch";

type DealWithCategory = Deal & {
  category?: Pick<Category, "id" | "name" | "slug"> | null;
};

/**
 * Check newly saved/submitted deals against all active price alerts.
 * Sends an in-app notification + email for each matching user.
 */
export async function matchDealsAgainstAlerts(
  deals: DealWithCategory[],
): Promise<number> {
  if (deals.length === 0) return 0;

  // Fetch all active alerts with their users (batch, not per-deal)
  const activeAlerts = await prisma.priceAlert.findMany({
    where: { isActive: true },
    include: {
      user: {
        select: { id: true, email: true, name: true, preferences: true },
      },
    },
  });

  if (activeAlerts.length === 0) return 0;

  // Group matches by userId so we send at most one email per user
  const userMatches = new Map<
    string,
    {
      user: {
        id: string;
        email: string;
        name: string | null;
        preferences: any;
      };
      deals: DealWithCategory[];
      alertIds: string[];
    }
  >();

  for (const deal of deals) {
    for (const alert of activeAlerts) {
      if (doesDealMatchAlert(deal, alert)) {
        const existing = userMatches.get(alert.userId);
        if (existing) {
          if (!existing.deals.some((d) => d.id === deal.id)) {
            existing.deals.push(deal);
          }
          if (!existing.alertIds.includes(alert.id)) {
            existing.alertIds.push(alert.id);
          }
        } else {
          userMatches.set(alert.userId, {
            user: alert.user,
            deals: [deal],
            alertIds: [alert.id],
          });
        }
      }
    }
  }

  let notificationCount = 0;

  // Send notifications per user
  for (const [userId, match] of userMatches) {
    try {
      // Create in-app notifications (one per deal)
      for (const deal of match.deals) {
        await prisma.notification.create({
          data: {
            userId,
            type: "PRICE_ALERT",
            title: `🔔 Deal Alert: ${deal.title}`,
            message: deal.dealPrice
              ? `₹${Number(deal.dealPrice).toLocaleString("en-IN")}${deal.discountPercent ? ` (${deal.discountPercent}% off)` : ""}`
              : deal.discountPercent
                ? `${deal.discountPercent}% off`
                : "New matching deal found!",
            data: { dealId: deal.id },
          },
        });
        notificationCount++;
      }

      // Send email if user has email notifications enabled
      const prefs = match.user.preferences;
      const emailEnabled = !prefs || prefs.emailNotifications !== false;

      if (emailEnabled && match.user.email) {
        const emailDeals = match.deals.map((d) => ({
          title: d.title,
          dealPrice: d.dealPrice ? Number(d.dealPrice) : 0,
          discountPercent: d.discountPercent || 0,
          productUrl: d.productUrl,
          store: d.store || "Unknown",
        }));

        await sendEmail({
          to: match.user.email,
          subject: `🔔 ${match.deals.length} deal${match.deals.length > 1 ? "s" : ""} match your alert!`,
          html: generatePriceAlertEmail(
            match.user.name || "Deal Hunter",
            emailDeals,
          ),
        });
      }

      // Update lastTriggeredAt on matched alerts
      await prisma.priceAlert.updateMany({
        where: { id: { in: match.alertIds } },
        data: { lastTriggeredAt: new Date() },
      });
    } catch (err) {
      logger.error(
        { error: err, userId },
        "Failed to send price alert notification",
      );
    }
  }

  if (notificationCount > 0) {
    logger.info(
      { notificationCount, usersNotified: userMatches.size },
      "Price alert notifications sent",
    );
  }

  return notificationCount;
}

/**
 * Check if a single deal matches a single alert.
 */
function doesDealMatchAlert(
  deal: DealWithCategory,
  alert: {
    mode: "KEYWORD" | "URL";
    keywords: string;
    watchUrlNormalized: string | null;
    maxPrice: any;
    categoryId: string | null;
    region: string | null;
  },
): boolean {
  // 1. Match by watch mode
  if (alert.mode === "URL") {
    if (!alert.watchUrlNormalized) return false;

    const normalizedDealUrl = normalizeWatchedProductUrl(deal.productUrl);
    if (!normalizedDealUrl || normalizedDealUrl !== alert.watchUrlNormalized) {
      return false;
    }
  } else {
    const keywords = alert.keywords
      .toLowerCase()
      .split(/\s+/)
      .filter((k) => k.length > 0);

    const searchText = `${deal.title} ${deal.description || ""}`.toLowerCase();
    const allKeywordsMatch = keywords.every((kw) => searchText.includes(kw));
    if (!allKeywordsMatch) return false;
  }

  // 2. Max price check (if specified)
  if (alert.maxPrice !== null && alert.maxPrice !== undefined) {
    const maxPrice = Number(alert.maxPrice);
    const dealPrice = deal.dealPrice ? Number(deal.dealPrice) : null;
    // Only match if deal has a price and it's within budget
    if (dealPrice === null || dealPrice > maxPrice) return false;
  }

  // 3. Category check (if specified)
  if (alert.categoryId) {
    if (deal.categoryId !== alert.categoryId) return false;
  }

  // 4. Region check (if specified)
  if (alert.region) {
    if (deal.region !== alert.region) return false;
  }

  return true;
}

export default { matchDealsAgainstAlerts };
