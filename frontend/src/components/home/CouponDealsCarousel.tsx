import { useEffect, useMemo, useState, type TouchEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Percent, TicketPercent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Deal } from "@/store/filterStore";

interface CouponDealsCarouselProps {
  deals: Deal[];
  isLoading?: boolean;
}

const COUPON_FEATURED_COUNT = 4;
const COUPON_RECENT_POOL_SIZE = 30;
const AUTO_ROTATE_MS = 4500;
const COUPON_INTENT_PATTERNS = [
  /\bcoupon(s)?\b/i,
  /\bcoupon\s*code\b/i,
  /\bpromo\b/i,
  /\bpromo\s*code\b/i,
  /\bvoucher\b/i,
  /\bdeal\s*code\b/i,
  /\bcashback\b/i,
] as const;

const getCurrencySymbol = (currency: string = "INR"): string => {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "EUR",
    GBP: "GBP",
    CAD: "C$",
    AUD: "A$",
    INR: "₹",
  };
  return symbols[currency] || "$";
};

function isCouponDeal(deal: Deal): boolean {
  const searchableText = [
    deal.cleanTitle,
    deal.title,
    deal.description,
  ]
    .filter(Boolean)
    .join(" ");

  return COUPON_INTENT_PATTERNS.some((pattern) => pattern.test(searchableText));
}

function selectCouponDeals(deals: Deal[]): Deal[] {
  if (!deals.length) return [];

  const couponDeals = deals.filter(isCouponDeal);
  if (!couponDeals.length) return [];

  const recent = [...couponDeals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return recent
    .slice(0, COUPON_RECENT_POOL_SIZE)
    .sort((a, b) => {
      const discountDiff = (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
      if (discountDiff !== 0) return discountDiff;

      const imageDiff = Number(Boolean(b.imageUrl)) - Number(Boolean(a.imageUrl));
      if (imageDiff !== 0) return imageDiff;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, COUPON_FEATURED_COUNT);
}

export function CouponDealsCarousel({
  deals,
  isLoading = false,
}: CouponDealsCarouselProps) {
  const couponDeals = useMemo(() => selectCouponDeals(deals), [deals]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    setActiveIndex(0);
  }, [couponDeals.length]);

  useEffect(() => {
    if (couponDeals.length <= 1 || paused) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % couponDeals.length);
    }, AUTO_ROTATE_MS);

    return () => window.clearInterval(intervalId);
  }, [couponDeals.length, paused]);

  const showPrevSlide = () => {
    setActiveIndex((prev) => {
      if (couponDeals.length === 0) return 0;
      return (prev - 1 + couponDeals.length) % couponDeals.length;
    });
  };

  const showNextSlide = () => {
    setActiveIndex((prev) => {
      if (couponDeals.length === 0) return 0;
      return (prev + 1) % couponDeals.length;
    });
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    setPaused(true);
    setTouchStartX(event.touches[0]?.clientX ?? null);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const endX = event.changedTouches[0]?.clientX;
    if (touchStartX === null || typeof endX !== "number") {
      setPaused(false);
      setTouchStartX(null);
      return;
    }

    const deltaX = endX - touchStartX;
    const swipeThreshold = 42;

    if (Math.abs(deltaX) >= swipeThreshold) {
      if (deltaX > 0) {
        showPrevSlide();
      } else {
        showNextSlide();
      }
    }

    setPaused(false);
    setTouchStartX(null);
  };

  if (isLoading) {
    return (
      <section className="mb-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-40 w-full rounded-2xl md:h-48" />
        </div>
      </section>
    );
  }

  if (!couponDeals.length) return null;

  return (
    <section className="mb-6">
      <div className="mb-3">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">
          Coupon-only deals
        </h2>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border bg-card shadow-sm"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={() => {
          setPaused(false);
          setTouchStartX(null);
        }}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {couponDeals.map((deal, index) => {
            const isActiveSlide = index === activeIndex;
            const dealPrice = deal.dealPrice ? Number.parseFloat(deal.dealPrice) : null;
            const originalPrice = deal.originalPrice
              ? Number.parseFloat(deal.originalPrice)
              : null;

            return (
              <article
                key={deal.id}
                className={cn(
                  "motion-carousel-panel relative min-w-full",
                  isActiveSlide
                    ? "opacity-100"
                    : "opacity-75 saturate-[0.92]",
                )}
              >
                <div className="relative h-44 w-full bg-secondary md:h-52">
                  {deal.imageUrl ? (
                    <img
                      src={deal.imageUrl}
                      alt={deal.title}
                      className={cn(
                        "motion-carousel-media h-full w-full object-cover",
                        isActiveSlide
                          ? "scale-100 opacity-100"
                          : "scale-[1.05] opacity-80",
                      )}
                      width={1200}
                      height={630}
                      loading="lazy"
                      fetchPriority="auto"
                      decoding="async"
                      sizes="(max-width: 768px) 100vw, 1200px"
                    />
                  ) : (
                    <div
                      className={cn(
                        "motion-carousel-media relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(230,0,35,0.36),transparent_22%),radial-gradient(circle_at_82%_24%,rgba(255,214,10,0.28),transparent_18%),linear-gradient(150deg,rgba(19,20,24,0.95)_0%,rgba(230,0,35,0.82)_42%,rgba(15,15,15,0.96)_100%)]",
                        isActiveSlide
                          ? "scale-100 opacity-100"
                          : "scale-[1.03] opacity-80",
                      )}
                    >
                      <div className="absolute -right-4 top-2 opacity-[0.16]">
                        <TicketPercent className="h-28 w-28 text-white md:h-36 md:w-36" />
                      </div>
                      <div className="absolute bottom-4 left-5 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[11px] font-medium text-white/85 backdrop-blur-sm">
                        Coupon deal
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/30 to-black/10" />
                </div>

                <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-5">
                  <div
                    className={cn(
                      "motion-carousel-copy flex items-center gap-2",
                      isActiveSlide
                        ? "translate-y-0 opacity-100"
                        : "translate-y-2 opacity-0",
                    )}
                    style={{ transitionDelay: isActiveSlide ? "70ms" : "0ms" }}
                  >
                    <Badge className="gap-1 bg-[#111111] text-white hover:bg-[#111111]">
                      <TicketPercent className="h-3 w-3" />
                      Coupon
                    </Badge>
                    {deal.discountPercent ? (
                      <Badge className="gap-1 bg-primary text-primary-foreground hover:bg-primary">
                        <Percent className="h-3 w-3" />
                        {deal.discountPercent}% OFF
                      </Badge>
                    ) : null}
                  </div>

                  <div
                    className={cn(
                      "motion-carousel-copy space-y-2",
                      isActiveSlide
                        ? "translate-y-0 opacity-100"
                        : "translate-y-3 opacity-0",
                    )}
                    style={{ transitionDelay: isActiveSlide ? "130ms" : "0ms" }}
                  >
                    <h3 className="max-w-[760px] line-clamp-2 text-base font-semibold text-white sm:text-lg md:text-xl">
                      {deal.cleanTitle || deal.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white">
                      {dealPrice !== null ? (
                        <span className="text-lg font-bold text-amber-300">
                          {getCurrencySymbol(deal.currency)}
                          {dealPrice.toLocaleString(
                            deal.currency === "INR" ? "en-IN" : "en-US",
                          )}
                        </span>
                      ) : (
                        <span className="text-sm">Check latest price</span>
                      )}

                      {originalPrice !== null && originalPrice > (dealPrice ?? 0) ? (
                        <span className="text-sm text-white/70 line-through">
                          {getCurrencySymbol(deal.currency)}
                          {originalPrice.toLocaleString(
                            deal.currency === "INR" ? "en-IN" : "en-US",
                          )}
                        </span>
                      ) : null}

                      <span className="inline-flex items-center gap-1 text-xs text-white/80">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(deal.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <Link
                      to={`/deal/${deal.id}`}
                      aria-label={`View deal details: ${deal.cleanTitle || deal.title}`}
                      title={`View deal details: ${deal.cleanTitle || deal.title}`}
                    >
                      <Button
                        size="sm"
                        className={cn(
                          "motion-carousel-cta mt-1 min-h-9 rounded-full bg-white text-foreground hover:bg-white/90",
                          isActiveSlide
                            ? "translate-y-0 opacity-100 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.45)]"
                            : "translate-y-3 opacity-0 shadow-none",
                        )}
                        style={{ transitionDelay: isActiveSlide ? "190ms" : "0ms" }}
                      >
                        View deal
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-full bg-black/35 px-2 py-1 md:left-1/2 md:right-auto md:-translate-x-1/2">
          {couponDeals.map((deal, index) => (
            <button
              key={deal.id}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full transition-all duration-200",
                index === activeIndex
                  ? "bg-white/25"
                  : "bg-transparent hover:bg-white/20",
              )}
              aria-label={`Go to coupon slide ${index + 1}`}
              title={`Coupon slide ${index + 1}`}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full transition-all duration-200",
                  index === activeIndex ? "w-3 bg-white" : "bg-white/65",
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CouponDealsCarousel;
