import { useMemo } from "react";
import { useAmazonDeals } from "@/hooks/useDeals";
import { dedupeDeals } from "@/lib/dealDeduping";
import type { Deal, DealRegion } from "@/store/filterStore";
import { DealCarousel } from "./DealCarousel";

interface AmazonDealsSplitCarouselProps {
  region: DealRegion;
  deals?: Deal[];
  queryEnabled?: boolean;
  loading?: boolean;
}

function isAmazonDeal(deal: Deal) {
  if (deal.store?.toLowerCase().includes("amazon")) return true;
  try {
    const host = new URL(deal.productUrl).hostname.toLowerCase();
    return host.includes("amazon.") || host.includes("amzn.");
  } catch {
    return false;
  }
}

export function AmazonDealsSplitCarousel({
  region,
  deals: preloadedDeals,
  queryEnabled = true,
  loading = false,
}: AmazonDealsSplitCarouselProps) {
  const { data: fetchedDeals = [], isLoading } = useAmazonDeals({
    region,
    enabled: queryEnabled && !Array.isArray(preloadedDeals),
  });
  const source = preloadedDeals ?? fetchedDeals;
  const picks = useMemo(
    () =>
      dedupeDeals(source)
        .filter(isAmazonDeal)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 18)
        .sort(
          (a, b) =>
            (b.discountPercent ?? 0) - (a.discountPercent ?? 0) ||
            Date.parse(b.createdAt) - Date.parse(a.createdAt),
        )
        .slice(0, 6),
    [source],
  );

  return (
    <DealCarousel
      title="Best Amazon deals today"
      deals={picks}
      isLoading={loading || isLoading}
      placement="amazon_carousel"
      itemsPerSlide={2}
      prioritizeImage
    />
  );
}

export default AmazonDealsSplitCarousel;
