import { useMemo } from "react";
import { useStoreDeals } from "@/hooks/useDeals";
import { dedupeDeals } from "@/lib/dealDeduping";
import type { Deal, DealRegion } from "@/store/filterStore";
import { DealCarousel } from "./DealCarousel";

interface MyntraHeroCarouselProps {
  region: DealRegion;
  variant?: "desktop" | "mobile";
  deals?: Deal[];
  queryEnabled?: boolean;
  loading?: boolean;
}

function isMyntraDeal(deal: Deal) {
  if (deal.store?.toLowerCase().includes("myntra")) return true;
  try {
    return new URL(deal.productUrl).hostname.toLowerCase().includes("myntra.");
  } catch {
    return false;
  }
}

export default function MyntraHeroCarousel({
  region,
  variant = "desktop",
  deals: preloadedDeals,
  queryEnabled = true,
  loading = false,
}: MyntraHeroCarouselProps) {
  const { data: fetchedDeals = [], isLoading } = useStoreDeals({
    store: "myntra",
    region,
    enabled: queryEnabled && !Array.isArray(preloadedDeals),
  });
  const source = preloadedDeals ?? fetchedDeals;
  const picks = useMemo(
    () =>
      dedupeDeals(source)
        .filter(isMyntraDeal)
        .sort(
          (a, b) =>
            (b.discountPercent ?? 0) - (a.discountPercent ?? 0) ||
            Date.parse(b.createdAt) - Date.parse(a.createdAt),
        )
        .slice(0, 5),
    [source],
  );
  const compact = variant === "desktop";

  return (
    <DealCarousel
      title={compact ? "Best deals today" : "Best Myntra deals today"}
      deals={picks}
      isLoading={loading || isLoading}
      placement="myntra_carousel"
      compact={compact}
      className={compact ? "hidden lg:flex" : "lg:hidden"}
    />
  );
}
