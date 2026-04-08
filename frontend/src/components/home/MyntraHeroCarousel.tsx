import { useEffect, useMemo, useState, type TouchEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";
import { dedupeDeals } from "@/lib/dealDeduping";
import { useStoreDeals, useTrackClick } from "@/hooks/useDeals";
import type { Deal, DealRegion } from "@/store/filterStore";

interface MyntraHeroCarouselProps {
  region: DealRegion;
  variant?: "desktop" | "mobile";
  deals?: Deal[];
  queryEnabled?: boolean;
  loading?: boolean;
}

const MAX_DEALS = 5;
const AUTO_ROTATE_MS = 4600;

function getCurrencySymbol(currency = "INR"): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    CAD: "C$",
    AUD: "A$",
    INR: "₹",
  };

  return symbols[currency] || "$";
}

function isMyntraDeal(deal: Deal): boolean {
  const store = deal.store?.trim().toLowerCase() ?? "";
  if (store.includes("myntra")) {
    return true;
  }

  try {
    const host = new URL(deal.productUrl).hostname
      .replace(/^(www|m)\./i, "")
      .toLowerCase();
    return host.includes("myntra.");
  } catch {
    return false;
  }
}

function selectMyntraDeals(deals: Deal[]): Deal[] {
  return deals
    .filter(isMyntraDeal)
    .sort((a, b) => {
      const discountDiff = (b.discountPercent ?? 0) - (a.discountPercent ?? 0);
      if (discountDiff !== 0) {
        return discountDiff;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, MAX_DEALS);
}

function MyntraDealImage({
  deal,
  density = "regular",
}: {
  deal: Deal;
  density?: "regular" | "tight";
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-[26px] border border-black/5 bg-[linear-gradient(145deg,rgba(252,231,243,0.88),rgba(255,255,255,0.98))]",
        density === "tight"
          ? "h-[164px] p-3 xl:h-[178px] min-[1700px]:h-full min-[1700px]:min-h-[360px] min-[1700px]:p-3"
          : "h-[178px] p-4 xl:h-[192px]",
      )}
    >
      {deal.imageUrl ? (
        <img
          src={deal.imageUrl}
          alt={deal.cleanTitle || deal.title}
          className="h-full max-h-full w-full object-contain drop-shadow-[0_18px_30px_rgba(15,23,42,0.14)] transition-transform duration-300 group-hover/myntra:scale-[1.03] min-[1700px]:scale-[1.08] min-[1700px]:group-hover/myntra:scale-[1.12]"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-[24px] bg-white/80 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.18)]",
            density === "tight"
              ? "h-[5.75rem] w-[5.75rem] text-[2.8rem]"
              : "h-28 w-28 text-5xl",
          )}
        >
          {getCategoryIcon(deal.category)}
        </div>
      )}
    </div>
  );
}

function getMyntraMobileImageLayout(aspectRatio: number | null) {
  if (aspectRatio === null) {
    return "balanced" as const;
  }

  if (aspectRatio >= 1.12) {
    return "landscape" as const;
  }

  if (aspectRatio <= 0.92) {
    return "portrait" as const;
  }

  return "balanced" as const;
}

function getMyntraMobileTitleClass(title: string, usesLandscapeMedia: boolean) {
  const titleLength = title.trim().length;

  if (usesLandscapeMedia) {
    if (titleLength > 84) {
      return "text-[0.98rem] leading-[1.08] tracking-[-0.028em]";
    }

    if (titleLength > 64) {
      return "text-[1.01rem] leading-[1.1] tracking-[-0.029em]";
    }

    return "text-[1.08rem] leading-[1.12] tracking-[-0.03em]";
  }

  if (titleLength > 86) {
    return "text-[0.94rem] leading-[1.08] tracking-[-0.026em]";
  }

  if (titleLength > 68) {
    return "text-[0.98rem] leading-[1.1] tracking-[-0.028em]";
  }

  return "text-[1.08rem] leading-[1.14] tracking-[-0.03em]";
}

function MyntraMobileDealImage({
  deal,
  prioritize,
  layout,
}: {
  deal: Deal;
  prioritize: boolean;
  layout: "landscape" | "portrait" | "balanced";
}) {
  if (!deal.imageUrl) {
    return (
      <div className="flex h-24 w-24 items-center justify-center rounded-[20px] bg-white/85 text-4xl shadow-[0_16px_28px_-22px_rgba(15,23,42,0.18)]">
        {getCategoryIcon(deal.category)}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <img
        src={deal.imageUrl}
        alt=""
        aria-hidden="true"
        className={cn(
          "absolute inset-0 h-full w-full scale-[1.08] object-cover opacity-18 blur-xl",
          layout === "portrait" ? "object-top" : "object-center",
        )}
        loading="lazy"
        decoding="async"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.14),rgba(255,255,255,0.32))]" />
      <img
        src={deal.imageUrl}
        alt={deal.cleanTitle || deal.title}
        className={cn(
          "relative z-10 h-full w-full object-contain drop-shadow-[0_16px_24px_rgba(15,23,42,0.12)] transition-transform duration-300",
          layout === "portrait"
            ? "object-center group-hover/myntra:scale-[1.015]"
            : layout === "landscape"
              ? "object-center group-hover/myntra:scale-[1.005]"
              : "object-center group-hover/myntra:scale-[1.01]",
        )}
        loading={prioritize ? "eager" : "lazy"}
        fetchPriority={prioritize ? "high" : "auto"}
        decoding="async"
        sizes="(max-width: 640px) 40vw, 200px"
      />
    </div>
  );
}

export default function MyntraHeroCarousel({
  region,
  variant = "desktop",
  deals: preloadedDeals,
  queryEnabled = true,
  loading = false,
}: MyntraHeroCarouselProps) {
  const navigate = useNavigate();
  const trackClick = useTrackClick();
  const hasPreloadedDeals = Array.isArray(preloadedDeals);
  const { data: fetchedDeals = [], isLoading } = useStoreDeals({
    store: "myntra",
    region,
    enabled: queryEnabled && !hasPreloadedDeals,
  });
  const sourceDeals = preloadedDeals ?? fetchedDeals;
  const deals = useMemo(
    () => selectMyntraDeals(dedupeDeals(sourceDeals)),
    [sourceDeals],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [dealImageAspectRatios, setDealImageAspectRatios] = useState<
    Record<string, number>
  >({});
  const isMobile = variant === "mobile";

  useEffect(() => {
    setActiveIndex(0);
  }, [region, deals.length]);

  useEffect(() => {
    if (deals.length <= 1 || paused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % deals.length);
    }, AUTO_ROTATE_MS);

    return () => window.clearInterval(intervalId);
  }, [deals.length, paused]);

  useEffect(() => {
    if (typeof window === "undefined" || deals.length === 0) {
      return;
    }

    let cancelled = false;

    deals.forEach((deal) => {
      if (!deal.imageUrl || dealImageAspectRatios[deal.id]) {
        return;
      }

      const image = new window.Image();
      image.decoding = "async";
      image.src = deal.imageUrl;
      image.onload = () => {
        if (cancelled || !image.naturalWidth || !image.naturalHeight) {
          return;
        }

        const aspectRatio = image.naturalWidth / image.naturalHeight;
        setDealImageAspectRatios((prev) => {
          if (prev[deal.id] === aspectRatio) {
            return prev;
          }

          return {
            ...prev,
            [deal.id]: aspectRatio,
          };
        });
      };
    });

    return () => {
      cancelled = true;
    };
  }, [deals, dealImageAspectRatios]);

  const showPrevSlide = () => {
    setActiveIndex((prev) => {
      if (deals.length === 0) {
        return 0;
      }

      return (prev - 1 + deals.length) % deals.length;
    });
  };

  const showNextSlide = () => {
    setActiveIndex((prev) => {
      if (deals.length === 0) {
        return 0;
      }

      return (prev + 1) % deals.length;
    });
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

  const formatDealDate = (createdAt: string) =>
    new Date(createdAt).toLocaleDateString();

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
    if (Math.abs(deltaX) >= 42 && deals.length > 1) {
      if (deltaX > 0) {
        showPrevSlide();
      } else {
        showNextSlide();
      }
    }

    setPaused(false);
    setTouchStartX(null);
  };

  if ((loading || isLoading) && !deals.length) {
    return isMobile ? (
      <section className="mb-6 space-y-3 lg:hidden">
        <div className="h-6 w-52 rounded bg-secondary/70" />
        <div className="h-[250px] rounded-[30px] border border-black/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(250,245,249,0.94))] shadow-[0_24px_70px_-54px_rgba(15,23,42,0.24)]" />
      </section>
    ) : (
      <aside className="hidden h-full lg:block">
        <div className="h-full w-full rounded-[30px] border border-black/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,245,249,0.94))] shadow-[0_28px_90px_-54px_rgba(15,23,42,0.28)]" />
      </aside>
    );
  }

  if (!deals.length) {
    return isMobile ? null : (
      <aside className="hidden h-full lg:block">
        <div className="flex h-full w-full flex-col justify-between rounded-[30px] border border-black/[0.08] bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,249,0.94))] p-3.5 shadow-[0_28px_90px_-54px_rgba(15,23,42,0.28)] xl:p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/75">
              Myntra
            </p>
            <h2 className="mt-1 text-base font-semibold tracking-[-0.03em] text-foreground xl:text-lg">
              Best Myntra deals today
            </h2>
          </div>

          <div className="rounded-[26px] border border-black/5 bg-[linear-gradient(145deg,rgba(252,231,243,0.88),rgba(255,255,255,0.98))] p-4">
            <div className="flex h-28 items-center justify-center rounded-[22px] bg-white/70 text-5xl shadow-[0_18px_36px_-24px_rgba(15,23,42,0.12)]">
              🛍️
            </div>
            <p className="mt-3 text-sm font-medium leading-relaxed text-foreground/72 xl:text-[15px]">
              Fresh Myntra picks will appear here when eligible deals are
              available.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const activeDeal = deals[activeIndex];

  if (isMobile) {
    return (
      <section className="mb-6 space-y-3 lg:hidden">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em]">
            Best Myntra deals today
          </h2>
        </div>

        <div
          className="overflow-hidden rounded-[30px] border bg-card shadow-sm"
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
            {deals.map((deal, index) => {
              const isActiveSlide = index === activeIndex;
              const isFirstSlide = index === 0;
              const slideDealPrice = deal.dealPrice
                ? Number.parseFloat(deal.dealPrice)
                : null;
              const slideOriginalPrice = deal.originalPrice
                ? Number.parseFloat(deal.originalPrice)
                : null;
              const imageLayout = getMyntraMobileImageLayout(
                dealImageAspectRatios[deal.id] ?? null,
              );
              const usesLandscapeMedia = imageLayout === "landscape";
              const slideTitle = deal.cleanTitle || deal.title;

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
                    "group/myntra motion-carousel-panel relative flex min-h-[288px] min-w-full cursor-pointer flex-col overflow-hidden p-3 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary/35",
                    usesLandscapeMedia && "min-h-[332px]",
                    isActiveSlide
                      ? "opacity-100"
                      : "opacity-80 saturate-[0.94]",
                  )}
                  style={{
                    background:
                      "radial-gradient(circle at top left, rgba(255, 66, 122, 0.1), transparent 38%), linear-gradient(160deg, rgba(255,248,244,0.98) 0%, rgba(255,255,255,1) 54%, rgba(255,244,248,0.92) 100%)",
                  }}
                >
                  <div
                    className={cn(
                      "motion-carousel-copy relative z-10 flex max-w-full flex-wrap items-center gap-1.5 pr-1",
                      isActiveSlide
                        ? "translate-y-0 opacity-100"
                        : "translate-y-2 opacity-0",
                    )}
                    style={{ transitionDelay: isActiveSlide ? "70ms" : "0ms" }}
                  >
                    <span className="rounded-full bg-[#111111] px-2.5 py-1 text-[11px] font-medium leading-none text-white">
                      Myntra
                    </span>
                    {deal.discountPercent ? (
                      <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium leading-none text-primary-foreground">
                        {deal.discountPercent}% OFF
                      </span>
                    ) : null}
                  </div>

                  <div
                    className={cn(
                      "mt-3 flex flex-1 gap-3",
                      usesLandscapeMedia ? "flex-col" : "",
                    )}
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div
                        className={cn(
                          "motion-carousel-copy text-[11px] font-medium tracking-[0.02em] text-muted-foreground/70",
                          isActiveSlide
                            ? "translate-y-0 opacity-100"
                            : "translate-y-3 opacity-0",
                        )}
                        style={{
                          transitionDelay: isActiveSlide ? "120ms" : "0ms",
                        }}
                      >
                        <span className="whitespace-nowrap">
                          {formatDealDate(deal.createdAt)}
                        </span>
                      </div>

                      <h3
                        className={cn(
                          "motion-carousel-copy mt-2 break-words text-pretty font-semibold text-foreground",
                          getMyntraMobileTitleClass(
                            slideTitle,
                            usesLandscapeMedia,
                          ),
                          isActiveSlide
                            ? "translate-y-0 opacity-100"
                            : "translate-y-3 opacity-0",
                        )}
                        style={{
                          transitionDelay: isActiveSlide ? "150ms" : "0ms",
                        }}
                      >
                        {slideTitle}
                      </h3>

                      <div
                        className={cn(
                          "motion-carousel-copy mt-3 flex min-h-[2.75rem] flex-wrap items-end gap-x-2 gap-y-1",
                          isActiveSlide
                            ? "translate-y-0 opacity-100"
                            : "translate-y-3 opacity-0",
                        )}
                        style={{
                          transitionDelay: isActiveSlide ? "190ms" : "0ms",
                        }}
                      >
                        {slideDealPrice !== null ? (
                          <span className="text-[1.75rem] font-bold leading-none text-emerald-600">
                            {getCurrencySymbol(deal.currency)}
                            {slideDealPrice.toLocaleString(
                              deal.currency === "INR" ? "en-IN" : "en-US",
                            )}
                          </span>
                        ) : (
                          <span className="max-w-[12ch] text-base font-medium leading-snug text-foreground">
                            Check latest price
                          </span>
                        )}

                        {slideOriginalPrice !== null &&
                        slideOriginalPrice > (slideDealPrice ?? 0) ? (
                          <span className="text-sm text-muted-foreground line-through">
                            {getCurrencySymbol(deal.currency)}
                            {slideOriginalPrice.toLocaleString(
                              deal.currency === "INR" ? "en-IN" : "en-US",
                            )}
                          </span>
                        ) : null}
                      </div>

                      {usesLandscapeMedia ? (
                        <div
                          className={cn(
                            "motion-carousel-media mt-3 h-[124px] w-full overflow-hidden rounded-[24px] border border-black/5 bg-[linear-gradient(145deg,rgba(252,231,243,0.82),rgba(255,255,255,0.98))]",
                            isActiveSlide
                              ? "translate-y-0 scale-100 opacity-100"
                              : "translate-y-4 scale-[0.95] opacity-0",
                          )}
                          style={{
                            transitionDelay: isActiveSlide ? "170ms" : "0ms",
                          }}
                        >
                          <MyntraMobileDealImage
                            deal={deal}
                            prioritize={isFirstSlide}
                            layout={imageLayout}
                          />
                        </div>
                      ) : null}

                      <div className={cn("mt-auto", usesLandscapeMedia ? "pt-4" : "pt-5")}>
                        <a
                          href={deal.affiliateUrl ?? deal.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(event) => handleCtaClick(event, deal.id)}
                          className={cn(
                            "motion-carousel-cta inline-flex h-11 items-center gap-2 self-start rounded-full bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90",
                            isActiveSlide
                              ? "translate-y-0 opacity-100 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.38)]"
                              : "translate-y-3 opacity-0 shadow-none",
                          )}
                          style={{
                            transitionDelay: isActiveSlide ? "230ms" : "0ms",
                          }}
                        >
                          View deal
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      </div>
                    </div>

                    {!usesLandscapeMedia ? (
                      <div
                        className={cn(
                          "motion-carousel-media pointer-events-none relative flex w-[43%] max-w-[158px] shrink-0 self-stretch items-stretch justify-center overflow-hidden rounded-[24px] border border-black/5 bg-[linear-gradient(145deg,rgba(252,231,243,0.82),rgba(255,255,255,0.98))] p-0 sm:w-[41%] sm:max-w-[166px]",
                          isActiveSlide
                            ? "translate-y-0 scale-100 opacity-100"
                            : "translate-y-4 scale-[0.95] opacity-0",
                        )}
                        style={{
                          transitionDelay: isActiveSlide ? "170ms" : "0ms",
                        }}
                      >
                        <MyntraMobileDealImage
                          deal={deal}
                          prioritize={isFirstSlide}
                          layout={imageLayout}
                        />
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 px-3 pb-3">
            {deals.map((deal, index) => (
              <button
                key={deal.id}
                onClick={() => setActiveIndex(index)}
                aria-label={`Go to Myntra slide ${index + 1}`}
                title={`Myntra slide ${index + 1}`}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-transparent"
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

  return (
    <aside className="hidden h-full lg:block">
      <div
        className="relative flex h-full w-full flex-col overflow-hidden rounded-[30px] border border-black/[0.08] bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,249,0.94))] p-3.5 shadow-[0_28px_90px_-54px_rgba(15,23,42,0.28)] xl:p-4"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="mb-2.5 flex items-start justify-between gap-2.5 xl:mb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/75">
              Myntra
            </p>
            <h2 className="mt-0.5 text-base font-semibold tracking-[-0.03em] text-foreground xl:text-[1.05rem]">
              Best Myntra deals today
            </h2>
          </div>
          {activeDeal.discountPercent ? (
            <div className="inline-flex h-8 items-center rounded-full bg-primary/10 px-2.5 text-xs font-semibold text-primary xl:h-[34px] xl:px-3">
              {activeDeal.discountPercent}% off
            </div>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div
            className="flex h-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {deals.map((deal, index) => {
              const isActiveSlide = index === activeIndex;
              const slideDealPrice = deal.dealPrice
                ? Number.parseFloat(deal.dealPrice)
                : null;
              const slideOriginalPrice = deal.originalPrice
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
                    "group/myntra motion-carousel-panel flex min-h-0 min-w-full cursor-pointer flex-col outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-primary/35 min-[1700px]:gap-4",
                    isActiveSlide
                      ? "opacity-100"
                      : "opacity-80 saturate-[0.94]",
                  )}
                >
                  <div
                    className={cn(
                      "motion-carousel-media min-[1700px]:min-h-0 min-[1700px]:flex-1",
                      isActiveSlide
                        ? "translate-y-0 scale-100 opacity-100"
                        : "translate-y-4 scale-[0.97] opacity-0",
                    )}
                    style={{
                      transitionDelay: isActiveSlide ? "90ms" : "0ms",
                    }}
                  >
                    <MyntraDealImage deal={deal} density="tight" />
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col pt-2 min-[1700px]:flex-none min-[1700px]:pt-0">
                    <div>
                      <div
                        className={cn(
                          "motion-carousel-copy text-[10px] font-medium tracking-[0.02em] text-muted-foreground/68 xl:text-[11px]",
                          isActiveSlide
                            ? "translate-y-0 opacity-100"
                            : "translate-y-3 opacity-0",
                        )}
                        style={{
                          transitionDelay: isActiveSlide ? "130ms" : "0ms",
                        }}
                      >
                        <span className="whitespace-nowrap">
                          {formatDealDate(deal.createdAt)}
                        </span>
                      </div>

                      <h3
                        className={cn(
                          "motion-carousel-copy mt-1.5 line-clamp-3 min-h-[2.8rem] text-[1.05rem] font-semibold leading-[1.1] tracking-[-0.032em] text-foreground xl:min-h-[3.1rem] xl:text-[1.15rem]",
                          isActiveSlide
                            ? "translate-y-0 opacity-100"
                            : "translate-y-3 opacity-0",
                        )}
                        style={{
                          transitionDelay: isActiveSlide ? "170ms" : "0ms",
                        }}
                      >
                        {deal.cleanTitle || deal.title}
                      </h3>

                      <div
                        className={cn(
                          "motion-carousel-copy mt-1.25 flex min-h-[1.75rem] flex-wrap items-end gap-x-2 gap-y-1",
                          isActiveSlide
                            ? "translate-y-0 opacity-100"
                            : "translate-y-3 opacity-0",
                        )}
                        style={{
                          transitionDelay: isActiveSlide ? "210ms" : "0ms",
                        }}
                      >
                        {slideDealPrice !== null ? (
                          <span className="text-[1.8rem] font-bold leading-none tracking-[-0.04em] text-emerald-600 xl:text-[1.95rem]">
                            {getCurrencySymbol(deal.currency)}
                            {slideDealPrice.toLocaleString(
                              deal.currency === "INR" ? "en-IN" : "en-US",
                            )}
                          </span>
                        ) : (
                          <span className="text-base font-medium text-foreground">
                            Check latest price
                          </span>
                        )}

                        {slideOriginalPrice !== null &&
                        slideOriginalPrice > (slideDealPrice ?? 0) ? (
                          <span className="text-sm text-muted-foreground line-through">
                            {getCurrencySymbol(deal.currency)}
                            {slideOriginalPrice.toLocaleString(
                              deal.currency === "INR" ? "en-IN" : "en-US",
                            )}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-6 min-[1700px]:mt-5">
                      <a
                        href={deal.affiliateUrl ?? deal.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => handleCtaClick(event, deal.id)}
                        className={cn(
                          "motion-carousel-cta inline-flex h-10 w-fit shrink-0 items-center gap-2 rounded-full bg-foreground px-4.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 lg:cursor-default",
                          isActiveSlide
                            ? "translate-y-0 opacity-100 shadow-[0_12px_24px_-18px_rgba(15,23,42,0.38)]"
                            : "translate-y-3 opacity-0 shadow-none",
                        )}
                        style={{
                          transitionDelay: isActiveSlide ? "250ms" : "0ms",
                        }}
                      >
                        View deal
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>

                    <div className="min-h-0 flex-1 min-[1700px]:hidden" />
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-2.5 flex shrink-0 items-center justify-center gap-1.5 min-[1700px]:mt-3.5">
          {deals.map((deal, index) => (
            <button
              key={deal.id}
              onClick={() => setActiveIndex(index)}
              aria-label={`Go to Myntra slide ${index + 1}`}
              title={`Myntra slide ${index + 1}`}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-transparent"
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full transition-all duration-200",
                  index === activeIndex
                    ? "w-3.5 bg-foreground"
                    : "bg-foreground/30",
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
