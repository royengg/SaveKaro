import { useMemo } from "react";
import type { Deal } from "@/store/filterStore";
import { DealCarousel } from "./DealCarousel";

interface FeaturedDealsCarouselProps {
  deals: Deal[];
  isLoading?: boolean;
  isImagePriorityPrimary?: boolean;
}

export function FeaturedDealsCarousel({
  deals,
  isLoading = false,
  isImagePriorityPrimary = true,
}: FeaturedDealsCarouselProps) {
  const picks = useMemo(
    () =>
      [...deals]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 24)
        .sort(
          (a, b) =>
            (b.discountPercent ?? 0) - (a.discountPercent ?? 0) ||
            Date.parse(b.createdAt) - Date.parse(a.createdAt),
        )
        .slice(0, 4),
    [deals],
  );

  return (
    <DealCarousel
      title="Best featured deals today"
      deals={picks}
      isLoading={isLoading}
      placement="featured_carousel"
      prioritizeImage={isImagePriorityPrimary}
    />
  );
}

export default FeaturedDealsCarousel;
