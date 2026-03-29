import { useEffect, useMemo, useState, type TouchEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, Percent } from "lucide-react";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { cn } from "@/lib/utils";
import { dedupeDeals } from "@/lib/dealDeduping";
import { useStoreDeals, useTrackClick } from "@/hooks/useDeals";
import type { Deal, DealRegion } from "@/store/filterStore";

interface MyntraHeroCarouselProps {
  region: DealRegion;
  variant?: "desktop" | "mobile";
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
    const host = new URL(deal.productUrl)
      .hostname.replace(/^(www|m)\./i, "")
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

function MyntraDealImage({ deal, compact = false }: { deal: Deal; compact?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-[26px] border border-black/5 bg-[linear-gradient(145deg,rgba(252,231,243,0.88),rgba(255,255,255,0.98))]",
        compact ? "h-[192px] p-4" : "h-[178px] p-4 xl:h-[192px]",
      )}
    >
      {deal.imageUrl ? (
        <img
          src={deal.imageUrl}
          alt={deal.cleanTitle || deal.title}
          className="h-full max-h-full w-full object-contain drop-shadow-[0_18px_30px_rgba(15,23,42,0.14)] transition-transform duration-300 group-hover/myntra:scale-[1.03]"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-[24px] bg-white/80 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.18)]",
            compact ? "h-24 w-24 text-4xl" : "h-28 w-28 text-5xl",
          )}
        >
          {getCategoryIcon(deal.category)}
        </div>
      )}
    </div>
  );
}

export default function MyntraHeroCarousel({
  region,
  variant = "desktop",
}: MyntraHeroCarouselProps) {
  const navigate = useNavigate();
  const trackClick = useTrackClick();
  const { data: fetchedDeals = [], isLoading } = useStoreDeals({
    store: "myntra",
    region,
  });
  const deals = useMemo(
    () => selectMyntraDeals(dedupeDeals(fetchedDeals)),
    [fetchedDeals],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
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
      setActiveIndex((prev) => {
        if (deltaX > 0) {
          return (prev - 1 + deals.length) % deals.length;
        }
        return (prev + 1) % deals.length;
      });
    }

    setPaused(false);
    setTouchStartX(null);
  };

  if (isLoading) {
    return isMobile ? (
      <section className="mb-6 space-y-3 lg:hidden">
        <div className="h-6 w-52 rounded bg-secondary/70" />
        <div className="h-[250px] rounded-[30px] border border-black/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(250,245,249,0.94))] shadow-[0_24px_70px_-54px_rgba(15,23,42,0.24)]" />
      </section>
    ) : (
      <aside className="hidden h-full lg:block">
        <div className="h-full rounded-[30px] border border-black/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,245,249,0.94))] shadow-[0_28px_90px_-54px_rgba(15,23,42,0.28)]" />
      </aside>
    );
  }

  if (!deals.length) {
    return isMobile ? null : (
      <aside className="hidden h-full lg:block">
        <div className="flex h-full flex-col justify-between rounded-[30px] border border-black/[0.08] bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,249,0.94))] p-4 shadow-[0_28px_90px_-54px_rgba(15,23,42,0.28)]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/75">
              Myntra
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-foreground">
              Best Myntra deals today
            </h2>
          </div>

          <div className="rounded-[26px] border border-black/5 bg-[linear-gradient(145deg,rgba(252,231,243,0.88),rgba(255,255,255,0.98))] p-5">
            <div className="flex h-40 items-center justify-center rounded-[22px] bg-white/70 text-5xl shadow-[0_18px_36px_-24px_rgba(15,23,42,0.12)]">
              🛍️
            </div>
            <p className="mt-4 text-base font-medium leading-relaxed text-foreground/72">
              Fresh Myntra picks will appear here when eligible deals are available.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  const activeDeal = deals[activeIndex];
  const dealPrice = activeDeal.dealPrice
    ? Number.parseFloat(activeDeal.dealPrice)
    : null;
  const originalPrice = activeDeal.originalPrice
    ? Number.parseFloat(activeDeal.originalPrice)
    : null;

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
          <article
            role="link"
            tabIndex={0}
            aria-label={`Open product details for ${activeDeal.cleanTitle || activeDeal.title}`}
            onClick={() => navigate(`/deal/${activeDeal.id}`)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") {
                return;
              }

              event.preventDefault();
              navigate(`/deal/${activeDeal.id}`);
            }}
            className="group/myntra relative flex min-h-[252px] cursor-pointer flex-col overflow-hidden p-3 outline-none"
            style={{
              background:
                "radial-gradient(circle at top left, rgba(255, 66, 122, 0.1), transparent 38%), linear-gradient(160deg, rgba(255,248,244,0.98) 0%, rgba(255,255,255,1) 54%, rgba(255,244,248,0.92) 100%)",
            }}
          >
            <div className="relative z-10 flex max-w-[58%] flex-wrap items-center gap-1.5 pr-1">
              <span className="rounded-full bg-[#111111] px-2.5 py-1 text-[11px] font-medium leading-none text-white">
                Myntra
              </span>
              {activeDeal.discountPercent ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium leading-none text-primary-foreground">
                  <Percent className="h-3 w-3" />
                  {activeDeal.discountPercent}% OFF
                </span>
              ) : null}
            </div>

            <div className="relative z-10 mt-3 flex max-w-[58%] items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground/75">
              <span className="font-semibold">Myntra</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(activeDeal.createdAt).toLocaleDateString()}
              </span>
            </div>

            <div className="pointer-events-none absolute inset-y-3 right-3 flex w-[40%] items-center justify-center overflow-hidden rounded-[24px] border border-black/5 bg-[linear-gradient(145deg,rgba(252,231,243,0.82),rgba(255,255,255,0.98))] p-3">
              {activeDeal.imageUrl ? (
                <img
                  src={activeDeal.imageUrl}
                  alt={activeDeal.cleanTitle || activeDeal.title}
                  className="h-full w-full object-contain drop-shadow-[0_14px_24px_rgba(15,23,42,0.14)] transition-transform duration-300 group-hover/myntra:scale-[1.03]"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-[20px] bg-white/85 text-4xl shadow-[0_16px_28px_-22px_rgba(15,23,42,0.18)]">
                  {getCategoryIcon(activeDeal.category)}
                </div>
              )}
            </div>

            <h3 className="relative z-10 mt-2 line-clamp-3 min-h-[3.9rem] max-w-[58%] break-words text-pretty text-[1.05rem] font-semibold leading-[1.14] tracking-[-0.03em] text-foreground">
              {activeDeal.cleanTitle || activeDeal.title}
            </h3>

            <div className="relative z-10 mt-3 flex min-h-[2.5rem] max-w-[58%] flex-wrap items-end gap-x-2 gap-y-1">
              {dealPrice !== null ? (
                <span className="text-[1.75rem] font-bold leading-none text-emerald-600">
                  {getCurrencySymbol(activeDeal.currency)}
                  {dealPrice.toLocaleString(
                    activeDeal.currency === "INR" ? "en-IN" : "en-US",
                  )}
                </span>
              ) : (
                <span className="text-base font-medium text-foreground">
                  Check latest price
                </span>
              )}

              {originalPrice !== null && originalPrice > (dealPrice ?? 0) ? (
                <span className="text-sm text-muted-foreground line-through">
                  {getCurrencySymbol(activeDeal.currency)}
                  {originalPrice.toLocaleString(
                    activeDeal.currency === "INR" ? "en-IN" : "en-US",
                  )}
                </span>
              ) : null}
            </div>

            <div className="relative z-10 mt-auto max-w-[58%] pt-4">
              <a
                href={activeDeal.affiliateUrl ?? activeDeal.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  event.stopPropagation();
                  trackClick.mutate(activeDeal.id);
                }}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                View deal
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </article>

          <div className="mt-4 flex items-center justify-center gap-2">
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
                    index === activeIndex ? "w-4 bg-foreground" : "bg-foreground/30",
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
        className="relative flex h-full flex-col overflow-hidden rounded-[30px] border border-black/[0.08] bg-[radial-gradient(circle_at_top_right,rgba(244,114,182,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,245,249,0.94))] p-4 shadow-[0_28px_90px_-54px_rgba(15,23,42,0.28)]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/75">
              Myntra
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-foreground">
              Best Myntra deals today
            </h2>
          </div>
          {activeDeal.discountPercent ? (
            <div className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary/10 px-3 text-sm font-semibold text-primary">
              <Percent className="h-3.5 w-3.5" />
              {activeDeal.discountPercent}% off
            </div>
          ) : null}
        </div>

        <article
          role="link"
          tabIndex={0}
          aria-label={`Open product details for ${activeDeal.cleanTitle || activeDeal.title}`}
          onClick={() => navigate(`/deal/${activeDeal.id}`)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") {
              return;
            }

            event.preventDefault();
            navigate(`/deal/${activeDeal.id}`);
          }}
          className="group/myntra flex min-h-0 flex-1 cursor-pointer flex-col outline-none"
        >
          <MyntraDealImage deal={activeDeal} />

          <div className="flex min-h-0 flex-1 flex-col pt-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground/75">
              <span className="font-semibold">Myntra</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {new Date(activeDeal.createdAt).toLocaleDateString()}
              </span>
            </div>

            <h3 className="mt-2 line-clamp-3 min-h-[5.4rem] text-xl font-semibold tracking-[-0.035em] text-foreground xl:min-h-[5.8rem] xl:text-[1.45rem]">
              {activeDeal.cleanTitle || activeDeal.title}
            </h3>

            <div className="mt-3 flex min-h-[3.1rem] flex-wrap items-end gap-x-2 gap-y-1.5">
              {dealPrice !== null ? (
                <span className="text-2xl font-bold leading-none text-emerald-600 xl:text-[2rem]">
                  {getCurrencySymbol(activeDeal.currency)}
                  {dealPrice.toLocaleString(
                    activeDeal.currency === "INR" ? "en-IN" : "en-US",
                  )}
                </span>
              ) : (
                <span className="text-base font-medium text-foreground">
                  Check latest price
                </span>
              )}

              {originalPrice !== null && originalPrice > (dealPrice ?? 0) ? (
                <span className="text-sm text-muted-foreground line-through">
                  {getCurrencySymbol(activeDeal.currency)}
                  {originalPrice.toLocaleString(
                    activeDeal.currency === "INR" ? "en-IN" : "en-US",
                  )}
                </span>
              ) : null}
            </div>

            <div className="mt-auto pt-5">
              <a
                href={activeDeal.affiliateUrl ?? activeDeal.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  event.stopPropagation();
                  trackClick.mutate(activeDeal.id);
                }}
                className="inline-flex h-10 w-fit shrink-0 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90 lg:cursor-default"
              >
                View deal
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </article>

        <div className="mt-5 flex shrink-0 items-center justify-center gap-2">
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
                  index === activeIndex ? "w-4 bg-foreground" : "bg-foreground/30",
                )}
              />
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
