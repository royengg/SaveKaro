import prisma from "../lib/prisma";
import { getCanonicalStoreKey } from "../lib/store-key";

const DESCRIPTION_URL_PATTERN = /(?<!\()https?:\/\/[^\s\)\]<>]+/g;
const STORE_PATTERNS: Array<{ store: string; pattern: RegExp }> = [
  { store: "Amazon", pattern: /(^|\.)amazon\./i },
  { store: "Amazon", pattern: /(^|\.)amzn\./i },
  { store: "Myntra", pattern: /(^|\.)myntr\.(in|it)$/i },
  { store: "Ajio", pattern: /(^|\.)ajio\.(com|co|me)$/i },
  { store: "Ajio", pattern: /(^|\.)ajiio\.(in|co|me)$/i },
  { store: "Nykaa", pattern: /(^|\.)nykaa\.com$/i },
  { store: "Croma", pattern: /(^|\.)croma\.com$/i },
  { store: "Reliance", pattern: /(^|\.)reliancedigital\.in$/i },
  { store: "Reliance", pattern: /(^|\.)jiomart\.com$/i },
  { store: "Tata", pattern: /(^|\.)tatacliq\.com$/i },
  { store: "Tata", pattern: /(^|\.)bigbasket\.com$/i },
  { store: "Blinkit", pattern: /(^|\.)blinkit\.com$/i },
  { store: "Zepto", pattern: /(^|\.)zepto\.co$/i },
  { store: "Swiggy", pattern: /(^|\.)swiggy\.com$/i },
  { store: "Steam", pattern: /(^|\.)steampowered\.com$/i },
  { store: "Epic Games", pattern: /(^|\.)epicgames\.com$/i },
  { store: "GOG", pattern: /(^|\.)gog\.com$/i },
];
const SHORTENER_PATTERNS = [
  /(^|\.)amzn\.to$/i,
  /(^|\.)bit\.ly$/i,
  /(^|\.)bitli\.in$/i,
  /(^|\.)bittli\.in$/i,
  /(^|\.)tinyurl\.com$/i,
  /(^|\.)rb\.gy$/i,
  /(^|\.)myntr\.(in|it)$/i,
  /(^|\.)myntr\.co\.in$/i,
  /(^|\.)ajio\.(co|me)$/i,
  /(^|\.)ajiio\.(co|me|in)$/i,
] as const;
const MIN_REPAIR_SCORE = 30;

function getArgValue(name: string): string | null {
  const prefix = `${name}=`;
  const valueArg = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return valueArg ? valueArg.slice(prefix.length) : null;
}

function normalizeUrl(rawUrl: string): string {
  return rawUrl
    .trim()
    .replace(/&amp;/g, "&")
    .replace(/^<|>$/g, "")
    .replace(/[)\],.!?;:]+$/g, "");
}

function normalizeHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^(www|m)\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function isRedditUrl(url: string): boolean {
  const host = normalizeHost(url);
  return !!host && (host === "reddit.com" || host.endsWith(".reddit.com") || host === "redd.it");
}

function looksLikeProductPath(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return /\/(dp\/|gp\/product|product|item|p\/|buy|deal|offer|offers|search|c\/)/i.test(
      pathname,
    );
  } catch {
    return false;
  }
}

function isHomepageUrl(url: string): boolean {
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

function detectStore(url: string): string | null {
  const host = normalizeHost(url);
  if (!host) return null;

  const match = STORE_PATTERNS.find(({ pattern }) => pattern.test(host));
  return match?.store ?? null;
}

function isKnownShortener(url: string): boolean {
  const host = normalizeHost(url);
  if (!host) return false;
  return SHORTENER_PATTERNS.some((pattern) => pattern.test(host));
}

function extractDescriptionUrls(description: string): string[] {
  return (description.match(DESCRIPTION_URL_PATTERN) || [])
    .map(normalizeUrl)
    .filter((url) => url.length > 0)
    .filter((url) => !isRedditUrl(url));
}

function scoreCandidateUrl(url: string): number {
  let score = 0;
  const store = detectStore(url);

  if (store) score += 100;
  if (isKnownShortener(url)) score += 80;
  if (looksLikeProductPath(url)) score += 25;
  if (!isHomepageUrl(url)) score += 10;

  return score;
}

function selectBestRepairUrl(description: string): { url: string; store: string | null } | null {
  const candidates = extractDescriptionUrls(description);
  if (candidates.length === 0) return null;

  const ranked = candidates
    .map((url) => ({
      url,
      store: detectStore(url),
      score: scoreCandidateUrl(url),
    }))
    .filter((candidate) => candidate.score >= MIN_REPAIR_SCORE)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return null;
  }

  return {
    url: ranked[0].url,
    store: ranked[0].store,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const limit = Math.max(
    1,
    Number.parseInt(getArgValue("--limit") || "500", 10) || 500,
  );

  const deals = await prisma.deal.findMany({
    where: {
      source: "REDDIT",
      isActive: true,
      description: { not: null },
      OR: [
        { productUrl: { contains: "reddit.com", mode: "insensitive" } },
        { productUrl: { contains: "redd.it", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      title: true,
      productUrl: true,
      store: true,
      redditPostId: true,
      description: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const repairs = deals
    .map((deal) => {
      const replacement = selectBestRepairUrl(deal.description || "");
      if (!replacement) {
        return null;
      }

      return {
        id: deal.id,
        redditPostId: deal.redditPostId,
        title: deal.title,
        currentProductUrl: deal.productUrl,
        nextProductUrl: replacement.url,
        nextStore: replacement.store,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        scanned: deals.length,
        repairable: repairs.length,
        sample: repairs.slice(0, 10),
      },
      null,
      2,
    ),
  );

  if (!apply || repairs.length === 0) {
    return;
  }

  for (const repair of repairs) {
    await prisma.deal.update({
      where: { id: repair.id },
      data: {
        productUrl: repair.nextProductUrl,
        ...(repair.nextStore ? { store: repair.nextStore } : {}),
        storeKey: getCanonicalStoreKey({
          store: repair.nextStore ?? null,
          productUrl: repair.nextProductUrl,
        }),
        cleanTitle: null,
        brand: null,
        titleProcessedAt: null,
      },
    });
  }

  console.log(
    JSON.stringify(
      {
        mode: "apply",
        repaired: repairs.length,
      },
      null,
      2,
    ),
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
