import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type TouchEvent,
} from "react";
import { flushSync } from "react-dom";
import { Link } from "react-router-dom";
import { ShoppingBag, TicketPercent } from "lucide-react";
import { useTrackClick } from "@/hooks/useDeals";
import { useViewportActivity } from "@/hooks/useViewportActivity";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { getCurrencySymbol } from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
  captureEvent,
  getDealEventProperties,
  type DealPlacement,
} from "@/lib/analytics/events";
import type { Deal } from "@/store/filterStore";
import "./deal-carousel.css";

interface DealCarouselProps {
  title: string;
  deals: Deal[];
  placement: DealPlacement;
  isLoading?: boolean;
  itemsPerSlide?: 1 | 2;
  compact?: boolean;
  className?: string;
  prioritizeImage?: boolean;
}

function subscribeMotionPreference(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getMotionPreference() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function parsePrice(value: string | null) {
  if (value === null || value.trim() === "") return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function DealPrice({ deal }: { deal: Deal }) {
  const price = parsePrice(deal.dealPrice);
  const original = parsePrice(deal.originalPrice);
  const format = (value: number) =>
    `${getCurrencySymbol(deal.currency)}${value.toLocaleString(deal.currency === "INR" ? "en-IN" : "en-US", { maximumFractionDigits: 2 })}`;
  return (
    <div className="deal-carousel-price">
      {price !== null ? (
        <strong>{format(price)}</strong>
      ) : (
        <span className="deal-carousel-price-unknown">Check latest price</span>
      )}
      {price !== null && original !== null && original > price ? (
        <del>{format(original)}</del>
      ) : null}
    </div>
  );
}

function DealImage({
  deal,
  priority,
  eager = false,
}: {
  deal: Deal;
  priority: boolean;
  eager?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return (
    <div className="deal-carousel-media">
      {deal.imageUrl && failedSource !== deal.imageUrl ? (
        <img
          src={deal.imageUrl}
          alt={deal.cleanTitle || deal.title}
          width={600}
          height={600}
          loading={priority || eager ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onError={() => setFailedSource(deal.imageUrl)}
        />
      ) : (
        <span className="deal-carousel-image-fallback" aria-hidden="true">
          {getCategoryIcon(deal.category)}
        </span>
      )}
    </div>
  );
}

/** One slide moves as a unit: copy never trails the image or an overlay. */
export function DealCarousel({
  title,
  deals,
  placement,
  isLoading = false,
  itemsPerSlide = 1,
  compact = false,
  className,
  prioritizeImage = false,
}: DealCarouselProps) {
  const headingId = useId();
  const trackClick = useTrackClick();
  const { ref, isActive } = useViewportActivity<HTMLElement>();
  const reducedMotion = useSyncExternalStore(
    subscribeMotionPreference,
    getMotionPreference,
    () => true,
  );
  const signature = `${itemsPerSlide}:${deals.map((deal) => deal.id).join("|")}`;
  const count = Math.ceil(deals.length / itemsPerSlide);
  const loops = count > 1;
  const [selection, setSelection] = useState({ signature, index: 0, instant: true });
  const selectedIndex = selection.signature === signature ? selection.index : 0;
  const activeIndex = count ? (selectedIndex + count) % count : 0;
  const isWrapping = loops && (selectedIndex < 0 || selectedIndex >= count);
  const trackRef = useRef<HTMLDivElement>(null);

  // New data and reduced motion must never animate across the entire track.
  if (selection.signature !== signature || (reducedMotion && isWrapping)) {
    setSelection({ signature, index: activeIndex, instant: true });
  }
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const touchStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressSwipeClick = useRef(false);
  const paused = hovered || focused || touching || reducedMotion;

  const goTo = useCallback(
    (index: number, keyboard = false) => {
      if (!loops) return;
      if (isWrapping) {
        // A fast second gesture can interrupt the boundary transition. Rebase to
        // the identical real slide before starting its next directional move.
        flushSync(() => {
          setSelection({ signature, index: activeIndex, instant: true });
        });
        trackRef.current?.getBoundingClientRect();
      }
      const instant = keyboard || reducedMotion;
      setSelection({
        signature,
        index: instant ? (index + count) % count : index,
        instant,
      });
    },
    [loops, isWrapping, signature, activeIndex, reducedMotion, count],
  );

  useEffect(() => {
    if (count <= 1 || paused || !isActive) return;
    const timer = window.setInterval(() => {
      goTo(activeIndex + 1);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [activeIndex, count, goTo, isActive, paused]);

  const firstImage = deals[0]?.imageUrl;
  useEffect(() => {
    if (!prioritizeImage || !firstImage) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = firstImage;
    link.setAttribute("fetchpriority", "high");
    document.head.appendChild(link);
    return () => link.remove();
  }, [firstImage, prioritizeImage]);

  const finishTouch = (event: TouchEvent<HTMLDivElement>) => {
    const end = Array.from(event.changedTouches).find(
      (touch) => touch.identifier === touchStart.current?.id,
    );
    // A second finger ending must not finish the original swipe.
    if (!end) return;
    if (touchStart.current && end) {
      const dx = end.clientX - touchStart.current.x;
      const dy = end.clientY - touchStart.current.y;
      if (Math.abs(dx) >= 42 && Math.abs(dx) > Math.abs(dy)) {
        suppressSwipeClick.current = true;
        goTo(activeIndex + (dx < 0 ? 1 : -1));
      }
    }
    touchStart.current = null;
    setTouching(false);
  };

  if (!deals.length && !isLoading && !compact) return null;
  const Root = compact ? "aside" : "section";
  const realSlides = Array.from({ length: count }, (_, index) => index);
  const slideIndexes = loops ? [count - 1, ...realSlides, 0] : realSlides;
  return (
    <Root
      ref={ref}
      className={cn(
        "deal-carousel",
        compact && "deal-carousel--compact",
        itemsPerSlide === 2 && "deal-carousel--pair",
        className,
      )}
      aria-labelledby={headingId}
      aria-roledescription="carousel"
      data-carousel={placement}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setHovered(false);
      }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        goTo(activeIndex + (event.key === "ArrowRight" ? 1 : -1), true);
      }}
    >
      <header className="deal-carousel-heading">
        {compact ? <p className="deal-carousel-eyebrow">Myntra</p> : null}
        <h2 id={headingId}>{title}</h2>
      </header>
      <div className="deal-carousel-surface">
        {isLoading && !deals.length ? (
          <div
            className="deal-carousel-loading"
            role="status"
            aria-label={`Loading ${title}`}
          >
            <div />
            <div>
              <span />
              <span />
              <span />
            </div>
          </div>
        ) : !deals.length ? (
          <div className="deal-carousel-empty">
            <ShoppingBag size={32} aria-hidden="true" />
            <p>Fresh Myntra picks will appear here.</p>
          </div>
        ) : (
          <>
            <div
              className="deal-carousel-window"
              onTouchStart={(event) => {
                if (touchStart.current) return;
                const touch = event.touches[0];
                touchStart.current = touch
                  ? { id: touch.identifier, x: touch.clientX, y: touch.clientY }
                  : null;
                suppressSwipeClick.current = false;
                setTouching(true);
              }}
              onTouchEnd={finishTouch}
              onTouchCancel={() => {
                touchStart.current = null;
                setTouching(false);
              }}
              onClickCapture={(event) => {
                if (!suppressSwipeClick.current) return;
                event.preventDefault();
                event.stopPropagation();
                suppressSwipeClick.current = false;
              }}
            >
              <div
                ref={trackRef}
                className={cn(
                  "deal-carousel-track",
                  selection.instant && "deal-carousel-track--instant",
                )}
                style={{
                  transform: `translateX(-${(selectedIndex + (loops ? 1 : 0)) * 100}%)`,
                }}
                onTransitionEnd={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    event.propertyName === "transform" &&
                    isWrapping
                  ) {
                    setSelection({ signature, index: activeIndex, instant: true });
                  }
                }}
              >
                {slideIndexes.map((slideIndex, trackIndex) => {
                  const isClone =
                    loops && (trackIndex === 0 || trackIndex === count + 1);
                  const inactive =
                    isClone || isWrapping || slideIndex !== activeIndex;
                  return (
                    <div
                      key={trackIndex}
                      className="deal-carousel-slide"
                      data-slide-index={slideIndex}
                      data-clone={isClone || undefined}
                      role="group"
                      aria-roledescription="slide"
                      aria-label={`${slideIndex + 1} of ${count}`}
                      aria-hidden={inactive}
                      inert={inactive}
                    >
                      {deals
                        .slice(
                          slideIndex * itemsPerSlide,
                          (slideIndex + 1) * itemsPerSlide,
                        )
                        .map((deal, dealIndex) => (
                          <article className="deal-carousel-deal" key={deal.id}>
                            <DealImage
                              deal={deal}
                              eager={isClone}
                              priority={
                                !isClone &&
                                prioritizeImage &&
                                slideIndex === 0 &&
                                dealIndex === 0
                              }
                            />
                            <div className="deal-carousel-copy">
                              <div className="deal-carousel-meta">
                                <span>
                                  {deal.store ||
                                    deal.category?.name ||
                                    "Featured pick"}
                                </span>
                                {placement === "coupon_carousel" ? (
                                  <span className="deal-carousel-coupon">
                                    <TicketPercent size={14} aria-hidden="true" />{" "}
                                    Coupon
                                  </span>
                                ) : null}
                                {!compact && deal.discountPercent ? (
                                  <span className="deal-carousel-discount">
                                    {deal.discountPercent}% off
                                  </span>
                                ) : null}
                              </div>
                              <h3>
                                <Link
                                  to={`/deal/${deal.id}`}
                                  className="deal-carousel-detail-link"
                                  onClick={() =>
                                    captureEvent(
                                      "deal:detail_open",
                                      getDealEventProperties(deal, placement),
                                    )
                                  }
                                >
                                  {deal.cleanTitle || deal.title}
                                </Link>
                              </h3>
                              <DealPrice deal={deal} />
                              <div className="deal-carousel-bottom">
                                <a
                                  className="deal-carousel-cta deal-action"
                                  href={deal.affiliateUrl ?? deal.productUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`View deal at ${deal.store || "the store"}: ${deal.cleanTitle || deal.title}`}
                                  onClick={() => {
                                    captureEvent(
                                      "deal:merchant_click_intent",
                                      getDealEventProperties(deal, placement),
                                    );
                                    trackClick.mutate(deal.id);
                                  }}
                                >
                                  View deal
                                </a>
                              </div>
                            </div>
                          </article>
                        ))}
                    </div>
                  );
                })}
              </div>
            </div>
            {count > 1 ? (
              <div className="deal-carousel-navigation">
                <div
                  className="deal-carousel-dots"
                  aria-label={`${title} slides`}
                >
                  {Array.from({ length: count }, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      aria-label={`Go to ${title} slide ${index + 1}`}
                      aria-current={index === activeIndex ? "true" : undefined}
                      onClick={(event) => goTo(index, event.detail === 0)}
                    >
                      <span />
                    </button>
                  ))}
                </div>
                <span
                  className="sr-only"
                  aria-live={focused ? "polite" : "off"}
                >
                  Slide {activeIndex + 1} of {count}
                </span>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Root>
  );
}
