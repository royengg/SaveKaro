import { memo, useEffect, useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  ArrowUp,
  MessageCircle,
  ShoppingCart,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { getCurrencySymbol } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { Deal } from "@/store/filterStore";
import { useAuthStore } from "@/store/authStore";
import AffiliateDisclosureNote from "@/components/legal/AffiliateDisclosureNote";
import {
  useVoteDeal,
  useSaveDeal,
  useTrackClick,
  useDeleteDeal,
} from "@/hooks/useDeals";
import { toast } from "sonner";
import { useDealCartStore } from "@/store/dealCartStore";
import {
  captureEvent,
  getDealEventProperties,
  type DealPlacement,
} from "@/lib/analytics/events";
import api from "@/lib/api";
import { loadDealDetailRoute } from "@/lib/routePreload";
import type { DealResponse } from "@/hooks/_dealCacheUtils";
import "./deal-card.css";

interface DealCardProps {
  deal: Deal;
  isPriority?: boolean;
  placement?: DealPlacement;
  position?: number;
}

const SKELETON_HEIGHT_CLASSES = ["h-32", "h-40", "h-48", "h-56", "h-64"] as const;

const stableHash = (seed: string | number) => {
  const str = String(seed);
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getStableSkeletonHeightClass = (seed: string | number) =>
  SKELETON_HEIGHT_CLASSES[stableHash(seed) % SKELETON_HEIGHT_CLASSES.length];

const DEAL_PREFETCH_DWELL_MS = 200;

function parsePrice(value: string | null) {
  if (value === null || value.trim() === "") return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function DealCardComponent({
  deal,
  isPriority = false,
  placement = "home_feed",
  position,
}: DealCardProps) {
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();
  const voteMutation = useVoteDeal();
  const saveMutation = useSaveDeal();
  const trackClick = useTrackClick();
  const deleteMutation = useDeleteDeal();
  const toggleCartDeal = useDealCartStore((state) => state.toggleDeal);
  const isInCart = useDealCartStore((state) =>
    state.items.some((item) => item.id === deal.id),
  );

  const [userVote, setUserVote] = useState<number | null>(
    deal.userUpvote ?? null,
  );
  const [isSaved, setIsSaved] = useState(deal.userSaved ?? false);
  const [voteCount, setVoteCount] = useState(deal.upvoteCount);
  const [votePulseKey, setVotePulseKey] = useState(0);
  const [savePulseKey, setSavePulseKey] = useState(0);
  const [cartPulseKey, setCartPulseKey] = useState(0);
  const cardRef = useRef<HTMLElement | null>(null);
  const detailPrefetchTimerRef = useRef<number | null>(null);
  const impressionCapturedRef = useRef(false);
  const impressionKeyRef = useRef<string | null>(null);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const detailsId = useId();
  const [hovered, setHovered] = useState(false);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const [detailsPinned, setDetailsPinned] = useState(false);
  const detailsOpen = hovered || keyboardFocused || detailsPinned;

  const voteSnapshot = `${deal.id}:${deal.userSaved}:${deal.userUpvote}:${deal.upvoteCount}`;
  const [previousVoteSnapshot, setPreviousVoteSnapshot] = useState(voteSnapshot);
  if (previousVoteSnapshot !== voteSnapshot) {
    setPreviousVoteSnapshot(voteSnapshot);
    setUserVote(deal.userUpvote ?? null);
    setIsSaved(deal.userSaved ?? false);
    setVoteCount(deal.upvoteCount);
  }

  useEffect(() => {
    const impressionKey = `${deal.id}:${placement}:${position ?? "unknown"}`;
    if (impressionKeyRef.current !== impressionKey) {
      impressionCapturedRef.current = false;
      impressionKeyRef.current = impressionKey;
    }
    const element = cardRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    let visibilityTimer: number | undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.5) {
          visibilityTimer = window.setTimeout(() => {
            if (!impressionCapturedRef.current) {
              impressionCapturedRef.current = true;
              captureEvent("deal:impression", {
                ...getDealEventProperties(deal, placement),
                position,
              });
            }
          }, 500);
        } else if (visibilityTimer) {
          window.clearTimeout(visibilityTimer);
          visibilityTimer = undefined;
        }
      },
      { threshold: [0.5] },
    );

    observer.observe(element);
    return () => {
      if (visibilityTimer) window.clearTimeout(visibilityTimer);
      observer.disconnect();
    };
  }, [deal, placement, position]);

  useEffect(
    () => () => {
      if (detailPrefetchTimerRef.current !== null) {
        window.clearTimeout(detailPrefetchTimerRef.current);
      }
    },
    [],
  );

  const handleVote = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Please sign in to vote");
      return;
    }

    const newValue = userVote === 1 ? 0 : 1;
    const voteDiff = newValue - (userVote ?? 0);

    setUserVote(newValue === 0 ? null : 1);
    setVoteCount((prev) => prev + voteDiff);
    setVotePulseKey((prev) => prev + 1);

    voteMutation.mutate({ id: deal.id, value: newValue as 1 | 0 });
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Please sign in to save deals");
      return;
    }

    setIsSaved(!isSaved);
    setSavePulseKey((prev) => prev + 1);
    saveMutation.mutate(deal.id);
  };

  const handleCartToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const added = toggleCartDeal(deal);
    captureEvent("cart:item_change", {
      ...getDealEventProperties(deal, placement),
      action: added ? "add" : "remove",
      cart_item_count: useDealCartStore.getState().items.length,
    });
    setCartPulseKey((prev) => prev + 1);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    captureEvent(
      "deal:merchant_click_intent",
      getDealEventProperties(deal, placement),
    );
    trackClick.mutate(deal.id);
  };

  const clearDealDetailPrefetch = () => {
    if (detailPrefetchTimerRef.current === null) return;
    window.clearTimeout(detailPrefetchTimerRef.current);
    detailPrefetchTimerRef.current = null;
  };

  const preloadDealDetail = () => {
    void loadDealDetailRoute();
    clearDealDetailPrefetch();
    detailPrefetchTimerRef.current = window.setTimeout(() => {
      detailPrefetchTimerRef.current = null;
      void queryClient.prefetchQuery({
        queryKey: ["deal", deal.id],
        queryFn: async ({ signal }) => {
          const response = (await api.getDeal(deal.id, signal)) as DealResponse;
          return response.data;
        },
        staleTime: 1000 * 30,
      });
    }, DEAL_PREFETCH_DWELL_MS);
  };

  const handleDetailLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    captureEvent("deal:detail_open", getDealEventProperties(deal, placement));
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      window.confirm(
        "Are you sure you want to delete this deal? This action cannot be undone.",
      )
    ) {
      deleteMutation.mutate(deal.id, {
        onSuccess: () => toast.success("Deal deleted successfully"),
      });
    }
  };

  const dealPrice = parsePrice(deal.dealPrice);
  const originalPrice = parsePrice(deal.originalPrice);
  const formatPrice = (price: number) =>
    `${getCurrencySymbol(deal.currency)}${price.toLocaleString(
      deal.currency === "INR" ? "en-IN" : "en-US",
      { maximumFractionDigits: 2 },
    )}`;
  const title = deal.cleanTitle || deal.title;

  return (
    <article
      ref={cardRef}
      className="deal-card"
      data-details-open={detailsOpen}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
        preloadDealDetail();
      }}
      onPointerLeave={() => {
        setHovered(false);
        clearDealDetailPrefetch();
      }}
      onFocusCapture={(event) => {
        setKeyboardFocused(event.target.matches(":focus-visible"));
        preloadDealDetail();
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setKeyboardFocused(false);
          clearDealDetailPrefetch();
        }
      }}
    >
      <div className="deal-card-media">
        <Link
          to={`/deal/${deal.id}`}
          onClick={handleDetailLinkClick}
          className="deal-card-image-link"
          aria-label={`Open deal page for ${title}`}
        >
          {deal.imageUrl && failedImage !== deal.imageUrl ? (
            <img
              src={deal.imageUrl}
              alt={title}
              loading={isPriority ? "eager" : "lazy"}
              fetchPriority={isPriority ? "high" : "auto"}
              decoding="async"
              width={800}
              height={1000}
              onError={() => setFailedImage(deal.imageUrl)}
            />
          ) : (
            <div className="deal-card-image-fallback" aria-hidden="true">
              {getCategoryIcon(deal.category)}
            </div>
          )}
        </Link>
        {deal.discountPercent !== null && deal.discountPercent >= 20 ? (
          <span className="deal-card-discount">{deal.discountPercent}% off</span>
        ) : null}
        <div className="deal-card-tools">
          <button
            type="button"
            className="deal-card-icon"
            aria-label={isSaved ? "Unsave deal" : "Save deal"}
            aria-pressed={isSaved}
            title={isSaved ? "Unsave deal" : "Save deal"}
            onClick={handleSave}
          >
            <span key={savePulseKey} className={cn(savePulseKey > 0 && "motion-action-pop")}>
              {isSaved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
            </span>
          </button>
          <button
            type="button"
            className="deal-card-icon"
            aria-label={isInCart ? "Remove from cart" : "Add to cart"}
            aria-pressed={isInCart}
            title={isInCart ? "Remove from cart" : "Add to cart"}
            onClick={handleCartToggle}
          >
            <span key={cartPulseKey} className={cn(cartPulseKey > 0 && "motion-action-pop")}>
              {isInCart ? <CheckCircle2 size={17} /> : <ShoppingCart size={17} />}
            </span>
          </button>
          {user?.isAdmin ? (
            <button type="button" className="deal-card-delete" onClick={handleDelete}>
              Delete
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className="deal-card-icon deal-card-details-toggle"
          aria-label={`${detailsOpen ? "Hide" : "Show"} deal details for ${title}`}
          aria-expanded={detailsOpen}
          aria-controls={detailsId}
          onClick={() => {
            setDetailsPinned(!detailsOpen);
            setHovered(false);
            setKeyboardFocused(false);
          }}
        >
          <Info size={17} aria-hidden="true" />
        </button>
      </div>
      <div
        id={detailsId}
        className="deal-card-details"
        aria-hidden={!detailsOpen}
        inert={!detailsOpen}
      >
        <div className="deal-card-details-clip">
          <div className="deal-card-content">
            <div className="deal-card-meta">
              <span>{deal.store || deal.brand || deal.category?.name || "Community deal"}</span>
              <Link
                to={`/deal/${deal.id}#comments`}
                className="deal-card-comments"
                aria-label={`View comments for ${title}`}
              >
                <MessageCircle size={14} aria-hidden="true" />
                {deal._count?.comments ?? 0}
              </Link>
            </div>
            <h3>
              <Link to={`/deal/${deal.id}`} onClick={handleDetailLinkClick}>{title}</Link>
            </h3>
            <div className="deal-card-price">
              {dealPrice !== null ? <strong>{formatPrice(dealPrice)}</strong> : <span>Check latest price</span>}
              {dealPrice !== null && originalPrice !== null && originalPrice > dealPrice ? (
                <del>{formatPrice(originalPrice)}</del>
              ) : null}
            </div>
            <div className="deal-card-bottom">
              <button
                type="button"
                className="deal-card-vote"
                onClick={handleVote}
                aria-label="Upvote deal"
                aria-pressed={userVote === 1}
              >
                <ArrowUp size={17} aria-hidden="true" />
                <span key={votePulseKey} className={cn(votePulseKey > 0 && "motion-count-bump")}>{voteCount}</span>
              </button>
              <a
                href={deal.affiliateUrl ?? deal.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="deal-action"
                onClick={handleClick}
                aria-label={`View deal at ${deal.store || "the store"}: ${title}`}
              >
                View deal <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>
            <AffiliateDisclosureNote variant="pill" className="deal-card-disclosure" />
          </div>
        </div>
      </div>
    </article>
  );
}

export const DealCard = memo(
  DealCardComponent,
  (prevProps, nextProps) =>
    prevProps.isPriority === nextProps.isPriority &&
    prevProps.deal === nextProps.deal &&
    prevProps.placement === nextProps.placement &&
    prevProps.position === nextProps.position,
);

export function DealCardSkeleton({ seed = 0 }: { seed?: string | number }) {
  return (
    <div className="deal-card" aria-hidden="true">
      <Skeleton className={cn("w-full rounded-none", getStableSkeletonHeightClass(seed))} />
    </div>
  );
}

export default DealCard;
