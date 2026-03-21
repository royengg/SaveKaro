import { useEffect, useMemo, useState, type TouchEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, Percent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";
import { useAmazonDeals, useTrackClick } from "@/hooks/useDeals";
import { dedupeDeals } from "@/lib/dealDeduping";
import type { Deal, DealRegion } from "@/store/filterStore";

interface AmazonDealsSplitCarouselProps {
  region: DealRegion;
}

const AMAZON_DEALS_PER_SLIDE = 2;
const AMAZON_POOL_SIZE = 18;
const AMAZON_MAX_DEALS = 6;
const AUTO_ROTATE_MS = 4500;
const LCP_PRELOAD_ATTR = "data-savekaro-lcp-preload";
const PRECONNECT_ATTR = "data-savekaro-image-preconnect";

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

function isAmazonDeal(deal: Deal): boolean {
  const store = deal.store?.trim().toLowerCase() ?? "";
  if (store.includes("amazon")) {
    return true;
  }

  try {
    const host = new URL(deal.productUrl).hostname.replace(/^(www|m)\./i, "").toLowerCase();
    return host.includes("amazon.");
  } catch {
    return false;
  }
}

function selectAmazonDeals(deals: Deal[]): Deal[] {
  if (!deals.length) return [];

  const amazonDeals = deals.filter(isAmazonDeal);
  if (!amazonDeals.length) return [];

  const recent = [...amazonDeals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return recent
    .slice(0, AMAZON_POOL_SIZE)
    .sort((a, b) => {
      const discountDiff = (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
      if (discountDiff !== 0) return discountDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, AMAZON_MAX_DEALS);
}

function chunkDeals(deals: Deal[]): Deal[][] {
  const slides: Deal[][] = [];
  for (let index = 0; index < deals.length; index += AMAZON_DEALS_PER_SLIDE) {
    slides.push(deals.slice(index, index + AMAZON_DEALS_PER_SLIDE));
  }
  return slides;
}

export function AmazonDealsSplitCarousel({
  region,
}: AmazonDealsSplitCarouselProps) {
  const navigate = useNavigate();
  const trackClick = useTrackClick();
  const { data: amazonDeals = [], isLoading } = useAmazonDeals({ region });
  const slides = useMemo(
    () => chunkDeals(selectAmazonDeals(dedupeDeals(amazonDeals))),
    [amazonDeals],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    setActiveIndex(0);
  }, [region, slides.length]);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, AUTO_ROTATE_MS);

    return () => window.clearInterval(intervalId);
  }, [slides.length, paused]);

  useEffect(() => {
    const preloadSelector = `link[${LCP_PRELOAD_ATTR}="home-amazon-image"]`;
    const existingPreload = document.head.querySelector<HTMLLinkElement>(
      preloadSelector,
    );
    const firstImage = slides[0]?.[0]?.imageUrl?.trim();

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
    preloadLink.setAttribute(LCP_PRELOAD_ATTR, "home-amazon-image");

    if (!existingPreload) {
      document.head.appendChild(preloadLink);
    }
  }, [slides]);

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
    if (Math.abs(deltaX) >= 42 && slides.length > 1) {
      setActiveIndex((prev) => {
        if (deltaX > 0) {
          return (prev - 1 + slides.length) % slides.length;
        }
        return (prev + 1) % slides.length;
      });
    }

    setPaused(false);
    setTouchStartX(null);
  };

  if (isLoading) {
    return (
      <section className="mb-6">
        <div className="space-y-3">
          <Skeleton className="h-6 w-52" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-56 rounded-[28px]" />
            <Skeleton className="h-56 rounded-[28px]" />
          </div>
        </div>
      </section>
    );
  }

  if (!slides.length) return null;

  const handleCardOpen = (dealId: string) => {
    navigate(`/deal/${dealId}`);
  };

  const handleCtaClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    dealId: string,
  ) => {
    event.stopPropagation();
    trackClick.mutate(dealId);
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
    navigate(`/deal/${dealId}`);
  };

  return (
    <section className="mb-6 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em]">
            Best Amazon deals today
          </h2>
        </div>
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
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {slides.map((slide, slideIndex) => {
            const isActiveSlide = slideIndex === activeIndex;

            return (
              <div
                key={`amazon-slide-${slideIndex}`}
                className="grid min-w-full grid-cols-2"
              >
                {slide.map((deal, dealIndex) => {
                  const isFirstImage = slideIndex === 0 && dealIndex === 0;
                  const layerDelay = dealIndex * 50;
                  const dealPrice = deal.dealPrice ? Number.parseFloat(deal.dealPrice) : null;
                  const originalPrice = deal.originalPrice
                    ? Number.parseFloat(deal.originalPrice)
                    : null;

                  return (
                    <article
                      key={deal.id}
                      role="link"
                      tabIndex={0}
                      aria-label={`Open product details for ${deal.cleanTitle || deal.title}`}
                      title={deal.cleanTitle || deal.title}
                      onClick={() => handleCardOpen(deal.id)}
                      onKeyDown={(event) => handleCardKeyDown(event, deal.id)}
                      className={cn(
                        "group/amazon motion-carousel-panel relative flex min-h-[322px] cursor-pointer flex-col overflow-hidden p-3 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary/35 sm:min-h-[232px] sm:p-4 md:min-h-[290px] md:p-5",
                        dealIndex === 0 && "border-r border-border/70",
                        isActiveSlide
                          ? "opacity-100"
                          : "opacity-80 saturate-[0.94]",
                      )}
                      style={{
                        background:
                          "radial-gradient(circle at top left, rgba(230,0,35,0.12), transparent 38%), linear-gradient(160deg, rgba(255,248,244,0.98) 0%, rgba(255,255,255,1) 52%, rgba(255,244,232,0.92) 100%)",
                      }}
                    >
                      <div
                        className={cn(
                          "motion-carousel-copy relative z-10 flex max-w-full flex-wrap items-center gap-1.5 pr-1 md:max-w-[58%]",
                          isActiveSlide
                            ? "translate-y-0 opacity-100"
                            : "translate-y-2 opacity-0",
                        )}
                        style={{
                          transitionDelay: isActiveSlide
                            ? `${70 + layerDelay}ms`
                            : "0ms",
                        }}
                      >
                        <Badge className="rounded-full bg-[#111111] px-2.5 py-1 text-[11px] leading-none text-white hover:bg-[#111111] md:text-xs">
                          Amazon
                        </Badge>
                        {deal.discountPercent ? (
                          <Badge className="gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] leading-none text-primary-foreground hover:bg-primary md:text-xs">
                            <Percent className="h-3 w-3" />
                            {deal.discountPercent}% OFF
                          </Badge>
                        ) : null}
                      </div>

                      <div className="mt-3 flex max-w-full flex-1 flex-col md:max-w-[58%]">
                        <div
                          className={cn(
                            "motion-carousel-copy space-y-2.5",
                            isActiveSlide
                              ? "translate-y-0 opacity-100"
                              : "translate-y-3 opacity-0",
                          )}
                          style={{
                            transitionDelay: isActiveSlide
                              ? `${120 + layerDelay}ms`
                              : "0ms",
                          }}
                        >
                          <h3 className="line-clamp-3 break-words text-pretty text-[13px] font-semibold leading-snug text-foreground sm:text-sm md:text-lg">
                            {deal.cleanTitle || deal.title}
                          </h3>

                          <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                            {dealPrice !== null ? (
                              <span className="text-xl font-bold leading-none text-emerald-600 md:text-2xl">
                                {getCurrencySymbol(deal.currency)}
                                {dealPrice.toLocaleString(
                                  deal.currency === "INR" ? "en-IN" : "en-US",
                                )}
                              </span>
                            ) : (
                              <span className="max-w-[12ch] text-sm font-medium leading-snug text-foreground md:max-w-none">
                                Check latest price
                              </span>
                            )}

                            {originalPrice !== null && originalPrice > (dealPrice ?? 0) ? (
                              <span className="text-xs text-muted-foreground line-through md:text-sm">
                                {getCurrencySymbol(deal.currency)}
                                {originalPrice.toLocaleString(
                                  deal.currency === "INR" ? "en-IN" : "en-US",
                                )}
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground md:text-xs">
                            <Clock className="h-3.5 w-3.5" />
                            {new Date(deal.createdAt).toLocaleDateString()}
                          </div>
                        </div>

                        <div
                          className={cn(
                            "motion-carousel-media relative mt-3 flex min-h-[124px] flex-1 items-center justify-center overflow-hidden rounded-[22px] bg-white/40 md:absolute md:inset-y-0 md:right-0 md:mt-0 md:w-[40%] md:items-end md:justify-end md:rounded-none md:bg-transparent md:p-2",
                            isActiveSlide
                              ? "translate-y-0 scale-100 opacity-100"
                              : "translate-y-4 scale-[0.95] opacity-0",
                          )}
                          style={{
                            transitionDelay: isActiveSlide
                              ? `${170 + layerDelay}ms`
                              : "0ms",
                          }}
                        >
                          {deal.imageUrl ? (
                            <img
                              src={deal.imageUrl}
                              alt={deal.cleanTitle || deal.title}
                              className="h-full max-h-[144px] w-full scale-[1.1] object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.14)] transition-transform duration-300 group-hover/amazon:scale-[1.14] md:h-[58%] md:max-h-none md:w-full md:scale-100 md:group-hover/amazon:scale-[1.04]"
                              width={720}
                              height={720}
                              loading={isFirstImage ? "eager" : "lazy"}
                              fetchPriority={isFirstImage ? "high" : "auto"}
                              decoding="async"
                              sizes="(max-width: 767px) 44vw, 33vw"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center rounded-[22px] bg-secondary/70 text-5xl md:h-[54%] md:rounded-[24px]">
                              {getCategoryIcon(deal.category)}
                            </div>
                          )}
                        </div>

                        <a
                          href={deal.affiliateUrl ?? deal.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => handleCtaClick(event, deal.id)}
                          aria-label={`Open deal link for ${deal.cleanTitle || deal.title}`}
                          title={`Open deal link for ${deal.cleanTitle || deal.title}`}
                          className={cn(
                            "motion-carousel-cta mt-3 inline-flex h-8 w-full cursor-default items-center justify-center gap-1 rounded-full bg-foreground px-3 text-[11px] font-medium whitespace-nowrap text-background transition-colors hover:bg-foreground/90 md:mt-auto md:h-9 md:w-fit md:max-w-full md:justify-start md:self-start md:px-4 md:text-sm",
                            isActiveSlide
                              ? "translate-y-0 opacity-100 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.38)]"
                              : "translate-y-3 opacity-0 shadow-none",
                          )}
                          style={{
                            transitionDelay: isActiveSlide
                              ? `${220 + layerDelay}ms`
                              : "0ms",
                          }}
                        >
                          View deal
                          <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </article>
                  );
                })}

                {slide.length === 1 ? (
                  <div
                    className={cn(
                      "motion-carousel-panel relative min-h-[322px] overflow-hidden border-l border-border/70 p-3 sm:min-h-[232px] sm:p-4 md:min-h-[290px] md:p-5",
                      isActiveSlide ? "opacity-100" : "opacity-80",
                    )}
                    style={{
                      background:
                        "radial-gradient(circle at bottom right, rgba(230,0,35,0.08), transparent 32%), linear-gradient(180deg, rgba(249,250,251,0.98) 0%, rgba(244,244,245,0.88) 100%)",
                    }}
                  >
                    <Badge className="bg-[#111111] text-white hover:bg-[#111111]">
                      Amazon
                    </Badge>
                    <div className="relative z-10 mt-4 max-w-[68%] space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground md:text-[11px]">
                        More picks rotate here
                      </p>
                      <h3 className="text-sm font-semibold leading-snug text-foreground sm:text-base md:text-lg">
                        Fresh Amazon deals will fill this slot as the feed updates.
                      </h3>
                      <p className="text-xs leading-relaxed text-muted-foreground md:text-sm">
                        Keep swiping through the dots for the next highest-discount set.
                      </p>
                    </div>
                    <div className="absolute bottom-4 right-4 text-6xl opacity-15 md:text-7xl">
                      📦
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/30 px-2.5 py-1">
          {slides.map((_, index) => (
            <button
              key={`amazon-dot-${index}`}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full transition-all duration-200",
                index === activeIndex
                  ? "bg-white/20"
                  : "bg-transparent hover:bg-white/16",
              )}
              aria-label={`Go to Amazon slide ${index + 1}`}
              title={`Amazon slide ${index + 1}`}
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

export default AmazonDealsSplitCarousel;
