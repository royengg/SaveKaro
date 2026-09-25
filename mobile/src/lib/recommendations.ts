import type { Deal, DealRegion } from "@savekaro/contracts";

const STOP_WORDS = new Set([
  "the",
  "and",
  "with",
  "from",
  "this",
  "that",
  "your",
  "for",
  "you",
  "deal",
  "deals",
  "offer",
  "offers",
  "sale",
  "today",
  "latest",
  "price",
  "best",
  "off",
  "flat",
  "upto",
  "only",
  "free",
  "check",
  "current",
  "store",
  "shop",
  "buy",
  "coupon",
  "promo",
  "code",
]);

export interface SavedDealSignal {
  id: string;
  title: string;
  cleanTitle?: string | null;
  brand?: string | null;
  store?: string | null;
  region: DealRegion;
  category?: { slug: string } | null;
}

type RecommendationSeed = SavedDealSignal & {
  userSaved?: boolean;
  userUpvote?: number | null;
};

interface SignalWeights {
  category: Map<string, number>;
  store: Map<string, number>;
  brand: Map<string, number>;
  titleToken: Map<string, number>;
}

function normalize(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function tokenize(...values: Array<string | null | undefined>): string[] {
  const tokens = values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));

  return Array.from(new Set(tokens));
}

function addWeight(weights: Map<string, number>, key: string, value: number) {
  if (key) weights.set(key, (weights.get(key) ?? 0) + value);
}

/** Re-ranks loaded deals using the same saved/upvoted signals as the web feed. */
export function rankDealsForUser({
  deals,
  savedSignals,
  region,
  referenceTime,
}: {
  deals: Deal[];
  savedSignals: SavedDealSignal[];
  region: DealRegion;
  referenceTime: number;
}): { deals: Deal[]; hasSignals: boolean } {
  const savedIds = new Set(savedSignals.map((deal) => deal.id));
  const seeds = new Map<string, RecommendationSeed>();

  savedSignals.forEach((deal) => {
    if (deal.region === region) seeds.set(deal.id, deal);
  });
  deals.forEach((deal) => {
    if (
      deal.region === region &&
      (deal.userSaved || deal.userUpvote === 1 || savedIds.has(deal.id))
    ) {
      seeds.set(deal.id, deal);
    }
  });

  const seedDeals = Array.from(seeds.values());
  if (!seedDeals.length) return { deals, hasSignals: false };

  const weights: SignalWeights = {
    category: new Map(),
    store: new Map(),
    brand: new Map(),
    titleToken: new Map(),
  };

  seedDeals.forEach((deal) => {
    const weight = savedIds.has(deal.id) || deal.userSaved ? 2.2 : 1.5;
    addWeight(weights.category, deal.category?.slug ?? "", weight);
    addWeight(weights.store, normalize(deal.store), weight);
    addWeight(weights.brand, normalize(deal.brand), weight);
    tokenize(deal.cleanTitle, deal.title, deal.brand, deal.store).forEach(
      (token) => addWeight(weights.titleToken, token, weight),
    );
  });

  const scored = deals.map((deal, index) => {
    if (seeds.has(deal.id)) return { deal, index, score: -1 };

    const category = deal.category?.slug ?? "";
    const store = normalize(deal.store);
    const brand = normalize(deal.brand);
    let score = (weights.category.get(category) ?? 0) * 8;
    score += (weights.store.get(store) ?? 0) * 10;
    score += (weights.brand.get(brand) ?? 0) * 7;

    const titleScore = tokenize(deal.cleanTitle, deal.title, deal.brand).reduce(
      (total, token) => total + (weights.titleToken.get(token) ?? 0),
      0,
    );
    score += Math.min(titleScore * 1.45, 18);
    score += Math.min((deal.discountPercent ?? 0) / 12, 6);
    score += deal.imageUrl ? 0.75 : 0;

    const ageHours =
      (referenceTime - new Date(deal.createdAt).getTime()) / 3_600_000;
    score += Math.max(0, 3 - ageHours / 24);
    return { deal, index, score };
  });

  const recommended = scored
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ deal }) => deal);
  const remaining = scored
    .filter(({ score }) => score <= 0)
    .sort((left, right) => left.index - right.index)
    .map(({ deal }) => deal);

  return { deals: recommended.concat(remaining), hasSignals: true };
}
