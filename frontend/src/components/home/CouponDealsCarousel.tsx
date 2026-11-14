import { useMemo } from "react";
import type { Deal } from "@/store/filterStore";
import { DealCarousel } from "./DealCarousel";

const COUPON_INTENT =
  /\b(coupons?|coupon\s*code|promo|promo\s*code|voucher|deal\s*code|cashback)\b/i;

export function CouponDealsCarousel({
  deals,
  isLoading = false,
}: {
  deals: Deal[];
  isLoading?: boolean;
}) {
  const picks = useMemo(
    () =>
      deals
        .filter((deal) =>
          COUPON_INTENT.test(
            [deal.cleanTitle, deal.title, deal.description]
              .filter(Boolean)
              .join(" "),
          ),
        )
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, 30)
        .sort(
          (a, b) =>
            (b.discountPercent ?? 0) - (a.discountPercent ?? 0) ||
            Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl)) ||
            Date.parse(b.createdAt) - Date.parse(a.createdAt),
        )
        .slice(0, 4),
    [deals],
  );

  return (
    <DealCarousel
      title="Coupon-only deals"
      deals={picks}
      isLoading={isLoading}
      placement="coupon_carousel"
    />
  );
}

export default CouponDealsCarousel;
