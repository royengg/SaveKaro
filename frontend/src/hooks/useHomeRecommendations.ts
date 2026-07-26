import { useMemo } from "react";
import type { Deal, DealRegion } from "@/store/filterStore";
import type { SavedDealSignal } from "@/hooks/useDeals";
import {
  normalizePreferenceValue,
  tokenizeRecommendationText,
} from "@/lib/homeUtils";

type RecommendationSeed = {
  id: string;
  title: string;
  cleanTitle?: string | null;
  brand?: string | null;
  store?: string | null;
  region: Deal["region"];
  category?: {
    slug: string;
  } | null;
  userSaved?: boolean;
  userUpvote?: number | null;
};

interface RecommendationSignals {
  categoryWeights: Map<string, number>;
  storeWeights: Map<string, number>;
  brandWeights: Map<string, number>;
  titleTokenWeights: Map<string, number>;
}

interface UseHomeRecommendationsOptions {
  deals: Deal[];
  savedSignals: SavedDealSignal[];
  region: DealRegion;
  isAuthenticated: boolean;
  activeDiscoveryPreset: "liked" | null;
}

interface UseHomeRecommendationsResult {
  displayDeals: Deal[];
  hasLikedSignals: boolean;
}

/**
 * Client-side recommendation engine for the Home feed.
 *
 * Builds weighted signals from saved/upvoted deals (category, store, brand,
 * title tokens) and re-ranks the feed when the "liked" discovery preset is
 * active. Returns the original deal order when the preset is inactive.
 */
export function useHomeRecommendations({
  deals,
  savedSignals,
  region,
  isAuthenticated,
  activeDiscoveryPreset,
}: UseHomeRecommendationsOptions): UseHomeRecommendationsResult {
  const savedDealIds = useMemo(() => {
    return new Set(savedSignals.map((deal) => deal.id));
  }, [savedSignals]);

  const likedSeedDeals = useMemo(() => {
    const seeds = new Map<string, RecommendationSeed>();

    savedSignals.forEach((deal) => {
      if (deal.region === region) {
        seeds.set(deal.id, deal);
      }
    });

    deals.forEach((deal) => {
      if (
        deal.region === region &&
        (deal.userSaved || deal.userUpvote === 1 || savedDealIds.has(deal.id))
      ) {
        seeds.set(deal.id, deal);
      }
    });

    return Array.from(seeds.values());
  }, [savedSignals, deals, region, savedDealIds]);

  const recommendationSignals = useMemo((): RecommendationSignals => {
    const categoryWeights = new Map<string, number>();
    const storeWeights = new Map<string, number>();
    const brandWeights = new Map<string, number>();
    const titleTokenWeights = new Map<string, number>();

    likedSeedDeals.forEach((deal) => {
      const signalWeight =
        savedDealIds.has(deal.id) || deal.userSaved ? 2.2 : 1.5;
      const categoryKey = deal.category?.slug;
      const storeKey = normalizePreferenceValue(deal.store);
      const brandKey = normalizePreferenceValue(deal.brand);

      if (categoryKey) {
        categoryWeights.set(
          categoryKey,
          (categoryWeights.get(categoryKey) ?? 0) + signalWeight,
        );
      }

      if (storeKey) {
        storeWeights.set(
          storeKey,
          (storeWeights.get(storeKey) ?? 0) + signalWeight,
        );
      }

      if (brandKey) {
        brandWeights.set(
          brandKey,
          (brandWeights.get(brandKey) ?? 0) + signalWeight,
        );
      }

      tokenizeRecommendationText(
        deal.cleanTitle,
        deal.title,
        deal.brand,
        deal.store,
      ).forEach((token) => {
        titleTokenWeights.set(
          token,
          (titleTokenWeights.get(token) ?? 0) + signalWeight,
        );
      });
    });

    return {
      categoryWeights,
      storeWeights,
      brandWeights,
      titleTokenWeights,
    };
  }, [likedSeedDeals, savedDealIds]);

  const hasLikedSignals = isAuthenticated && likedSeedDeals.length > 0;

  const displayDeals = useMemo(() => {
    if (activeDiscoveryPreset !== "liked" || !hasLikedSignals) {
      return deals;
    }

    const likedDealIds = new Set(likedSeedDeals.map((deal) => deal.id));

    const scoredDeals = deals.map((deal, index) => {
      if (likedDealIds.has(deal.id)) {
        return { deal, index, score: -1 };
      }

      let score = 0;
      const categoryKey = deal.category?.slug;
      const storeKey = normalizePreferenceValue(deal.store);
      const brandKey = normalizePreferenceValue(deal.brand);

      if (categoryKey) {
        score +=
          (recommendationSignals.categoryWeights.get(categoryKey) ?? 0) * 8;
      }

      if (storeKey) {
        score += (recommendationSignals.storeWeights.get(storeKey) ?? 0) * 10;
      }

      if (brandKey) {
        score += (recommendationSignals.brandWeights.get(brandKey) ?? 0) * 7;
      }

      const titleTokenScore = tokenizeRecommendationText(
        deal.cleanTitle,
        deal.title,
        deal.brand,
      ).reduce((total, token) => {
        return (
          total + (recommendationSignals.titleTokenWeights.get(token) ?? 0)
        );
      }, 0);

      score += Math.min(titleTokenScore * 1.45, 18);
      score += Math.min((deal.discountPercent ?? 0) / 12, 6);
      score += deal.imageUrl ? 0.75 : 0;

      const ageInHours =
        (Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60);
      score += Math.max(0, 3 - ageInHours / 24);

      return { deal, index, score };
    });

    const recommended = scoredDeals
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.index - b.index;
      })
      .map(({ deal }) => deal);

    const remaining = scoredDeals
      .filter(({ score }) => score <= 0)
      .sort((a, b) => a.index - b.index)
      .map(({ deal }) => deal);

    return recommended.concat(remaining);
  }, [
    activeDiscoveryPreset,
    deals,
    hasLikedSignals,
    likedSeedDeals,
    recommendationSignals,
  ]);

  return { displayDeals, hasLikedSignals };
}
