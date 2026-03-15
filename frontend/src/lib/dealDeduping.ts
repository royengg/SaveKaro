import type { Deal } from "@/store/filterStore";

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

function normalizeComparableUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^(www|m)\./i, "").toLowerCase();
    let pathname =
      parsed.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/g, "") || "/";

    if (host === "reddit.com" || host.endsWith(".reddit.com") || host === "redd.it") {
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
      .map(([key, value]) => [key.trim().toLowerCase(), value.trim().toLowerCase()] as const)
      .sort(([a], [b]) => a.localeCompare(b));

    const normalizedQuery = keptEntries.length
      ? `?${new URLSearchParams(
          keptEntries.map(([key, value]) => [key, value]),
        ).toString()}`
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
    .replace(/\b(?:upto|up to|flat|extra|starting from|from|deal|sale|offer|offers|coupon|code|mrp|price|drop)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getDealDeduplicationKey(deal: Deal): string {
  const comparableUrl = normalizeComparableUrl(deal.productUrl);
  if (comparableUrl && !comparableUrl.startsWith("reddit:")) {
    return `url:${comparableUrl}`;
  }

  const normalizedStore = deal.store?.trim().toLowerCase();
  const normalizedTitle = normalizeComparableTitle(deal.cleanTitle || deal.title);

  if (
    normalizedStore &&
    normalizedTitle &&
    normalizedTitle.length >= 18
  ) {
    return `title:${normalizedStore}:${normalizedTitle}`;
  }

  return `id:${deal.id}`;
}

export function dedupeDeals<T extends Deal>(deals: T[]): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const deal of deals) {
    const key = getDealDeduplicationKey(deal);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(deal);
  }

  return deduped;
}

export default dedupeDeals;
