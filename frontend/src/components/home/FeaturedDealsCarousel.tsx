import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type CSSProperties,
  type TouchEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";
import { useTrackClick } from "@/hooks/useDeals";
import type { Deal } from "@/store/filterStore";

interface FeaturedDealsCarouselProps {
  deals: Deal[];
  isLoading?: boolean;
  isImagePriorityPrimary?: boolean;
}

const FEATURED_COUNT = 4;
const RECENT_POOL_SIZE = 24;
const AUTO_ROTATE_MS = 4500;
const LCP_PRELOAD_ATTR = "data-savekaro-lcp-preload";
const PRECONNECT_ATTR = "data-savekaro-image-preconnect";
const DEFAULT_FALLBACK_COLOR = "#e60023";

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

function normalizeHexColor(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_FALLBACK_COLOR;
  }

  const trimmed = value.trim();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) {
    return trimmed;
  }

  const shortHexMatch = trimmed.match(/^#([0-9a-f]{3})$/i);
  if (!shortHexMatch) {
    return DEFAULT_FALLBACK_COLOR;
  }

  const [r, g, b] = shortHexMatch[1].split("");
  return `#${r}${r}${g}${g}${b}${b}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = normalizeHexColor(hex);
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
}

function getFallbackBackgroundStyle(
  color: string | null | undefined,
): CSSProperties {
  const [r, g, b] = hexToRgb(color ?? DEFAULT_FALLBACK_COLOR);

  return {
    background: `
      radial-gradient(circle at 18% 20%, rgba(${r}, ${g}, ${b}, 0.46), transparent 24%),
      radial-gradient(circle at 82% 18%, rgba(255, 255, 255, 0.16), transparent 18%),
      radial-gradient(circle at 70% 82%, rgba(${r}, ${g}, ${b}, 0.26), transparent 28%),
      linear-gradient(145deg, rgba(10, 10, 10, 0.94) 0%, rgba(${r}, ${g}, ${b}, 0.68) 44%, rgba(21, 23, 28, 0.96) 100%)
    `,
  };
}

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
  isImagePriorityPrimary = true,
}: FeaturedDealsCarouselProps) {
  const navigate = useNavigate();
  const trackClick = useTrackClick();
  const featuredDeals = useMemo(() => selectFeaturedDeals(deals), [deals]);
  const featuredDealSignature = useMemo(
    () => featuredDeals.map((deal) => deal.id).join("|"),
    [featuredDeals],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useLayoutEffect(() => {
    setActiveIndex(0);
  }, [featuredDealSignature]);

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
    if (!isImagePriorityPrimary) {
      existingPreload?.remove();
      return;
    }

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

    const imageOrigin = new URL(resolvedImageUrl).origin;
    if (imageOrigin !== window.location.origin) {
      const preconnectSelector = `link[rel="preconnect"][${PRECONNECT_ATTR}="${imageOrigin}"]`;
      if (!document.head.querySelector(preconnectSelector)) {
        const preconnectLink = document.createElement("link");
        preconnectLink.rel = "preconnect";
        preconnectLink.href = imageOrigin;
        preconnectLink.crossOrigin = "anonymous";
        preconnectLink.setAttribute(PRECONNECT_ATTR, imageOrigin);
        document.head.appendChild(preconnectLink);
      }
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
  }, [featuredDeals, isImagePriorityPrimary]);

  if (isLoading && !featuredDeals.length) {
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

  const handleCardOpen = (dealId: string) => {
    navigate(`/deal/${dealId}`);
  };

  const handleCardKeyDown = (
    event: React.KeyboardEvent<HTMLElement>,
    dealId: string,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    if (event.target !== event.currentTarget) {
      return;
    }

    event.preventDefault();
    handleCardOpen(dealId);
  };

  const handleCtaClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    dealId: string,
  ) => {
    event.stopPropagation();
    trackClick.mutate(dealId);
  };

  return (
    <section className="mb-6">
      <div className="mb-3">
        <h2 className="text-lg font-semibold tracking-[-0.02em]">
          Best featured deals today
        </h2>
      </div>

      <div
        className="relative overflow-hidden rounded-[30px] border bg-card shadow-sm"
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
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {featuredDeals.map((deal, index) => {
              const isFirstSlide = index === 0;
              const isActiveSlide = index === activeIndex;
              const prioritizeImage = isImagePriorityPrimary && isFirstSlide;
              const dealPrice = deal.dealPrice ? Number.parseFloat(deal.dealPrice) : null;
              const originalPrice = deal.originalPrice
                ? Number.parseFloat(deal.originalPrice)
                : null;

              return (
                <article
                  key={deal.id}
                  className={cn(
                    "motion-carousel-panel relative min-w-full overflow-hidden cursor-pointer",
                    isActiveSlide
                      ? "opacity-100"
                      : "opacity-75 saturate-[0.92]",
                  )}
                  onClick={() => handleCardOpen(deal.id)}
                  onKeyDown={(event) => handleCardKeyDown(event, deal.id)}
                  role="link"
                  tabIndex={0}
                  aria-label={`Open deal page for ${deal.cleanTitle || deal.title}`}
                >
                  <div className="relative h-56 w-full bg-secondary md:h-60 xl:h-64">
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
                        loading={prioritizeImage ? "eager" : "lazy"}
                        fetchPriority={prioritizeImage ? "high" : "auto"}
                        decoding="async"
                        sizes="(max-width: 768px) 100vw, 1200px"
                      />
                    ) : (
                      <div
                        className={cn(
                          "motion-carousel-media relative h-full w-full overflow-hidden",
                          isActiveSlide
                            ? "scale-100 opacity-100"
                            : "scale-[1.03] opacity-80",
                        )}
                        style={getFallbackBackgroundStyle(deal.category?.color)}
                      >
                        <div className="absolute inset-0 opacity-[0.1]">
                          <div className="absolute -right-4 -top-5 text-[72px] md:text-[88px]">
                            {getCategoryIcon(deal.category)}
                          </div>
                          <div className="absolute bottom-4 left-5 text-[52px] md:text-[64px]">
                            {getCategoryIcon(deal.category)}
                          </div>
                        </div>
                        <div className="absolute left-4 top-16 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm md:top-20">
                          {deal.store || "Featured pick"}
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/12" />
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
                      {deal.discountPercent ? (
                        <Badge className="bg-emerald-500 text-white hover:bg-emerald-600">
                          {deal.discountPercent}% OFF
                        </Badge>
                      ) : null}
                      <Badge variant="secondary" className="bg-white/85 text-foreground">
                        {deal.category?.name ?? "Deal"}
                      </Badge>
                    </div>

                    <div
                      className={cn(
                        "motion-carousel-copy space-y-1.5 md:space-y-2",
                        isActiveSlide
                          ? "translate-y-0 opacity-100"
                          : "translate-y-3 opacity-0",
                      )}
                      style={{ transitionDelay: isActiveSlide ? "130ms" : "0ms" }}
                    >
                      <div className="inline-flex items-center gap-1 text-xs text-white/80">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(deal.createdAt).toLocaleDateString()}
                      </div>

                      <h3 className="max-w-[760px] line-clamp-2 text-base font-semibold text-white sm:text-lg md:text-xl">
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
                      </div>

                      <a
                        href={deal.affiliateUrl ?? deal.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => handleCtaClick(event, deal.id)}
                        aria-label={`Open store page for ${deal.cleanTitle || deal.title}`}
                        title={`Open store page for ${deal.cleanTitle || deal.title}`}
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
                      </a>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 px-3 pb-3 pt-2">
          {featuredDeals.map((deal, index) => (
            <button
              key={deal.id}
              onClick={() => setActiveIndex(index)}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-transparent"
              aria-label={`Go to slide ${index + 1}`}
              title={`Slide ${index + 1}`}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full transition-all duration-200",
                  index === activeIndex
                    ? "w-4 bg-foreground"
                    : "bg-foreground/30",
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
