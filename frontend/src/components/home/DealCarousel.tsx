import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type TouchEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
  ShoppingBag,
  TicketPercent,
} from "lucide-react";
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

function DealImage({ deal, priority }: { deal: Deal; priority: boolean }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return (
    <div className="deal-carousel-media">
      {deal.imageUrl && failedSource !== deal.imageUrl ? (
        <img
          src={deal.imageUrl}
          alt={deal.cleanTitle || deal.title}
          width={600}
          height={600}
          loading={priority ? "eager" : "lazy"}
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
  const signature = deals.map((deal) => deal.id).join("|");
  const count = Math.ceil(deals.length / itemsPerSlide);
  const [selection, setSelection] = useState({ signature, index: 0 });
  const activeIndex =
    selection.signature === signature
      ? Math.min(selection.index, Math.max(0, count - 1))
      : 0;
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [instant, setInstant] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const suppressSwipeClick = useRef(false);
  const paused = userPaused || hovered || focused || touching || reducedMotion;

  useEffect(() => {
    if (count <= 1 || paused || !isActive) return;
    const timer = window.setInterval(() => {
      setInstant(false);
      setSelection({ signature, index: (activeIndex + 1) % count });
    }, 4500);
    return () => window.clearInterval(timer);
  }, [activeIndex, count, isActive, paused, signature]);

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

  const goTo = (index: number, keyboard = false) => {
    if (!count) return;
    setInstant(keyboard);
    setSelection({ signature, index: (index + count) % count });
  };

  const finishTouch = (event: TouchEvent<HTMLDivElement>) => {
    const end = event.changedTouches[0];
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
                const touch = event.touches[0];
                touchStart.current = touch
                  ? { x: touch.clientX, y: touch.clientY }
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
                className={cn(
                  "deal-carousel-track",
                  instant && "deal-carousel-track--instant",
                )}
                style={{ transform: `translateX(-${activeIndex * 100}%)` }}
              >
                {Array.from({ length: count }, (_, slideIndex) => (
                  <div
                    key={slideIndex}
                    className="deal-carousel-slide"
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${slideIndex + 1} of ${count}`}
                    aria-hidden={slideIndex !== activeIndex}
                    inert={slideIndex !== activeIndex}
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
                            priority={
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
                              <time dateTime={deal.createdAt}>
                                {new Date(deal.createdAt).toLocaleDateString(
                                  undefined,
                                  { day: "numeric", month: "short" },
                                )}
                              </time>
                              <a
                                className="deal-carousel-cta"
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
                                View deal{" "}
                                <ArrowRight size={16} aria-hidden="true" />
                              </a>
                            </div>
                          </div>
                        </article>
                      ))}
                  </div>
                ))}
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
                <div className="deal-carousel-controls">
                  <button
                    type="button"
                    aria-label={`${userPaused || reducedMotion ? "Play" : "Pause"} ${title} carousel`}
                    disabled={reducedMotion}
                    onClick={() => setUserPaused(!userPaused)}
                  >
                    {userPaused || reducedMotion ? (
                      <Play size={15} aria-hidden="true" />
                    ) : (
                      <Pause size={15} aria-hidden="true" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={`Previous ${title} slide`}
                    onClick={(event) =>
                      goTo(activeIndex - 1, event.detail === 0)
                    }
                  >
                    <ArrowLeft size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Next ${title} slide`}
                    onClick={(event) =>
                      goTo(activeIndex + 1, event.detail === 0)
                    }
                  >
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
                <span
                  className="sr-only"
                  aria-live={focused || userPaused ? "polite" : "off"}
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
