import { useEffect, useMemo, useState, type TouchEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Deal } from "@/store/filterStore";

interface FeaturedDealsCarouselProps {
  deals: Deal[];
  isLoading?: boolean;
}

const FEATURED_COUNT = 4;
const RECENT_POOL_SIZE = 24;
const AUTO_ROTATE_MS = 4500;
const LCP_PRELOAD_ATTR = "data-savekaro-lcp-preload";

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

function selectFeaturedDeals(deals: Deal[]): Deal[] {
  if (!deals.length) return [];

  const recent = [...deals].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return recent
    .slice(0, RECENT_POOL_SIZE)
    .sort((a, b) => {
      const discountDiff = (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
      if (discountDiff !== 0) return discountDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, FEATURED_COUNT);
}

export function FeaturedDealsCarousel({
  deals,
  isLoading = false,
}: FeaturedDealsCarouselProps) {
  const featuredDeals = useMemo(() => selectFeaturedDeals(deals), [deals]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    setActiveIndex(0);
  }, [featuredDeals.length]);

  useEffect(() => {
    if (featuredDeals.length <= 1 || paused) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featuredDeals.length);
    }, AUTO_ROTATE_MS);

    return () => window.clearInterval(intervalId);
  }, [featuredDeals.length, paused]);

  useEffect(() => {
    const preloadSelector = `link[${LCP_PRELOAD_ATTR}="home-hero-image"]`;
    const existingPreload = document.head.querySelector<HTMLLinkElement>(
      preloadSelector,
    );
    const firstImage = featuredDeals[0]?.imageUrl?.trim();

    if (!firstImage) {
      existingPreload?.remove();
      return;
    }

    let resolvedImageUrl: string;
    try {
      resolvedImageUrl = new URL(firstImage, window.location.href).toString();
    } catch {
      existingPreload?.remove();
      return;
    }

    const preloadLink = existingPreload ?? document.createElement("link");
    preloadLink.rel = "preload";
    preloadLink.as = "image";
    preloadLink.href = resolvedImageUrl;
    preloadLink.setAttribute("fetchpriority", "high");
    preloadLink.setAttribute(LCP_PRELOAD_ATTR, "home-hero-image");

    if (!existingPreload) {
      document.head.appendChild(preloadLink);
    }
  }, [featuredDeals]);

  if (isLoading) {
    return (
      <section className="mb-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-40 md:h-48 w-full rounded-2xl" />
        </div>
      </section>
    );
  }

  if (!featuredDeals.length) return null;

  const showPrevSlide = () => {
    setActiveIndex((prev) => {
      if (featuredDeals.length === 0) return 0;
      return (prev - 1 + featuredDeals.length) % featuredDeals.length;
    });
  };

  const showNextSlide = () => {
    setActiveIndex((prev) => {
      if (featuredDeals.length === 0) return 0;
      return (prev + 1) % featuredDeals.length;
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
    const SWIPE_THRESHOLD = 42;

    if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      if (deltaX > 0) {
        showPrevSlide();
      } else {
        showNextSlide();
      }
    }

    setPaused(false);
    setTouchStartX(null);
  };

  return (
    <section className="mb-6">
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
          {featuredDeals.map((deal, index) => {
            const isFirstSlide = index === 0;
            const dealPrice = deal.dealPrice ? Number.parseFloat(deal.dealPrice) : null;
            const originalPrice = deal.originalPrice
              ? Number.parseFloat(deal.originalPrice)
              : null;

            return (
              <article key={deal.id} className="relative min-w-full">
                <div className="relative h-44 md:h-52 w-full bg-secondary">
                  {deal.imageUrl ? (
                    <img
                      src={deal.imageUrl}
                      alt={deal.title}
                      className="h-full w-full object-cover"
                      width={1200}
                      height={630}
                      loading={isFirstSlide ? "eager" : "lazy"}
                      fetchPriority={isFirstSlide ? "high" : "auto"}
                      decoding="async"
                      sizes="(max-width: 768px) 100vw, 1200px"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-primary/15 via-primary/25 to-primary/35" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/12" />
                </div>

                <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-5">
                  <div className="flex items-center gap-2">
                    {deal.discountPercent ? (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
                        <Percent className="h-3 w-3" />
                        {deal.discountPercent}% OFF
                      </Badge>
                    ) : null}
                    <Badge variant="secondary" className="bg-white/85 text-foreground">
                      {deal.category?.name ?? "Deal"}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <h3 className="max-w-[760px] line-clamp-2 text-base sm:text-lg md:text-xl font-semibold text-white">
                      {deal.cleanTitle || deal.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white">
                      {dealPrice !== null ? (
                        <span className="text-lg font-bold text-emerald-300">
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
                        className="mt-1 rounded-full bg-white text-foreground hover:bg-white/90 min-h-9"
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
          {featuredDeals.map((deal, index) => (
            <button
              key={deal.id}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full transition-all duration-200",
                index === activeIndex
                  ? "bg-white/25"
                  : "bg-transparent hover:bg-white/20",
              )}
              aria-label={`Go to slide ${index + 1}`}
              title={`Slide ${index + 1}`}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full transition-all duration-200",
                  index === activeIndex
                    ? "w-3 bg-white"
                    : "bg-white/65",
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturedDealsCarousel;
