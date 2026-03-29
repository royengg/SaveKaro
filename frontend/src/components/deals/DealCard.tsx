import { memo, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  ArrowUp,
  MessageCircle,
  ShoppingCart,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryIcon } from "@/lib/categoryIcons";
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

interface DealCardProps {
  deal: Deal;
  isPriority?: boolean;
}

// Currency symbol mapping
const getCurrencySymbol = (currency: string = "INR"): string => {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    CAD: "C$",
    AUD: "A$",
    INR: "₹",
  };
  return symbols[currency] || "$";
};

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

const DEAL_SEAM_SILVER = "rgba(214, 222, 232, 0.95)";

function DealCardComponent({ deal, isPriority = false }: DealCardProps) {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
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
  const imageFrameRef = useRef<HTMLDivElement | null>(null);
  const [useTightOverlay, setUseTightOverlay] = useState(false);
  const [useCompactFooterActions, setUseCompactFooterActions] = useState(false);

  useEffect(() => {
    setUserVote(deal.userUpvote ?? null);
    setIsSaved(deal.userSaved ?? false);
    setVoteCount(deal.upvoteCount);
  }, [deal.userSaved, deal.userUpvote, deal.upvoteCount]);

  useEffect(() => {
    const element = imageFrameRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateOverlayDensity = (width: number, height: number) => {
      setUseTightOverlay(width < 300 || height < 250);
      setUseCompactFooterActions(width < 240);
    };

    updateOverlayDensity(element.offsetWidth, element.offsetHeight);

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      updateOverlayDensity(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [deal.id]);

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

    toggleCartDeal(deal);
    setCartPulseKey((prev) => prev + 1);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackClick.mutate(deal.id);
  };

  const handleCardClick = () => {
    navigate(`/deal/${deal.id}`);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" && e.key !== " ") {
      return;
    }

    if (e.target !== e.currentTarget) {
      return;
    }

    e.preventDefault();
    handleCardClick();
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

  const dealPrice = deal.dealPrice ? parseFloat(deal.dealPrice) : null;
  const originalPrice = deal.originalPrice
    ? parseFloat(deal.originalPrice)
    : null;
  return (
    <div
      className="deal-card group relative cursor-pointer overflow-hidden rounded-[28px] border border-black/[0.075] bg-[linear-gradient(180deg,rgba(255,255,255,0.985),rgba(246,248,251,0.95))] shadow-[0_22px_38px_-28px_rgba(15,23,42,0.26)] deal-hover-lift"
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`Open deal page for ${deal.cleanTitle || deal.title}`}
    >
      {/* Image Container - Pinterest style rounded corners, no border */}
      <div className="block">
        <div
          ref={imageFrameRef}
          className="relative overflow-hidden bg-secondary"
        >
          {deal.imageUrl ? (
            <img
              src={deal.imageUrl}
              alt={deal.title}
              className="w-full h-auto object-cover transition-all duration-200 group-hover:brightness-[0.85]"
              loading={isPriority ? "eager" : "lazy"}
              fetchPriority={isPriority ? "high" : "auto"}
              decoding="async"
              width={800}
              height={1000}
              style={{ minHeight: "100px", maxHeight: "400px" }}
            />
          ) : (
            <div
              className="w-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-primary/20 to-primary/30"
              style={{ aspectRatio: "4/5" }}
            >
              <span className="text-6xl">{getCategoryIcon(deal.category)}</span>
            </div>
          )}

          {/* Discount Badge - Pill style */}
          {deal.discountPercent && deal.discountPercent >= 20 && (
            <Badge
              className={cn(
                "absolute top-3 left-3 font-bold text-sm rounded-full shadow-lg px-3",
                deal.discountPercent >= 50
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-emerald-500 hover:bg-emerald-600",
              )}
            >
              {deal.discountPercent}% OFF
            </Badge>
          )}

          {/* Hover Overlay (desktop only) - keeps card interactions touch-friendly on mobile */}
          <div className="absolute inset-0 hidden md:block opacity-0 translate-y-1 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:translate-y-0">
            {/* Top Actions */}
            <div className="absolute top-3 right-3 flex gap-2">
              <Button
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full shadow-lg transition-[transform,background-color,color,box-shadow] duration-200 hover:-translate-y-[1px] active:scale-[0.96]",
                  isInCart
                    ? "bg-emerald-500 text-white shadow-[0_16px_24px_-18px_rgba(16,185,129,0.78)] hover:bg-emerald-500"
                    : "bg-white/95 text-foreground hover:bg-white",
                )}
                onClick={handleCartToggle}
                title={isInCart ? "Remove from cart" : "Add to cart"}
                aria-label={isInCart ? "Remove from cart" : "Add to cart"}
              >
                <span
                  key={`cart-desktop-${cartPulseKey}-${Number(isInCart)}`}
                  className={cn("inline-flex", cartPulseKey > 0 && "motion-action-pop")}
                >
                  {isInCart ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <ShoppingCart className="h-5 w-5" />
                  )}
                </span>
              </Button>

              <Button
                size="icon"
                className={cn(
                  "h-10 w-10 rounded-full shadow-lg transition-[transform,background-color,color,box-shadow] duration-200 hover:-translate-y-[1px] active:scale-[0.96]",
                  isSaved
                    ? "bg-primary text-primary-foreground shadow-[0_16px_24px_-18px_rgba(124,58,237,0.72)]"
                    : "bg-white/95 hover:bg-white text-foreground",
                )}
                onClick={handleSave}
                title={isSaved ? "Unsave deal" : "Save deal"}
                aria-label={isSaved ? "Unsave deal" : "Save deal"}
              >
                <span
                  key={`save-desktop-${savePulseKey}-${Number(isSaved)}`}
                  className={cn("inline-flex", savePulseKey > 0 && "motion-action-pop")}
                >
                  {isSaved ? (
                    <BookmarkCheck className="h-5 w-5" />
                  ) : (
                    <Bookmark className="h-5 w-5" />
                  )}
                </span>
              </Button>

              {user?.isAdmin ? (
                <Button
                  size="sm"
                  className="h-10 rounded-full bg-white/95 px-3 text-xs font-semibold text-red-600 shadow-lg transition-transform hover:scale-105 hover:bg-white"
                  onClick={handleDelete}
                  title="Delete deal"
                  aria-label="Delete deal"
                >
                  Delete
                </Button>
              ) : null}
            </div>

            {/* Bottom Action - View Deal Button */}
            <div
              className={cn(
                "absolute bottom-3 left-3 right-3 z-20",
                useTightOverlay ? "space-y-1.5" : "space-y-2",
              )}
            >
              <a
                href={deal.affiliateUrl ?? deal.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClick}
                aria-label={`Open store page for ${deal.cleanTitle || deal.title}`}
                title={`Open store page for ${deal.cleanTitle || deal.title}`}
                className="block"
              >
                <Button
                  className={cn(
                    "w-full rounded-full shadow-lg font-semibold",
                    useTightOverlay
                      ? "h-9 gap-1.5 px-3 text-sm"
                      : "h-11 gap-2",
                  )}
                >
                  View Deal
                  <ExternalLink
                    className={cn(useTightOverlay ? "h-3.5 w-3.5" : "h-4 w-4")}
                  />
                </Button>
              </a>
              <AffiliateDisclosureNote
                compact={!useTightOverlay}
                tone="inverse"
                variant={useTightOverlay ? "pill" : "full"}
                className={cn(
                  useTightOverlay
                    ? "w-fit max-w-full"
                    : "rounded-md bg-black/45 px-2 py-1",
                )}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none relative px-3.5">
        <div className="h-px w-full bg-[linear-gradient(90deg,rgba(15,23,42,0),rgba(15,23,42,0.075),rgba(15,23,42,0))]" />
        <div className="flex justify-center">
          <span
            className="mt-[-1px] block h-[3px] w-12 rounded-full opacity-75"
            style={{
              background: `linear-gradient(90deg, transparent, ${DEAL_SEAM_SILVER}, transparent)`,
            }}
          />
        </div>
      </div>

      {/* Content - same card surface, no floating pedestal */}
      <div
        className={cn(
          "relative pb-3 pt-2.5",
          useCompactFooterActions ? "px-3" : "px-3.5",
        )}
      >
        {/* Brand Badge */}
        {deal.brand && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/88">
            {deal.brand}
          </span>
        )}

        {/* Title - use cleanTitle if available */}
        <Link
          to={`/deal/${deal.id}`}
          onClick={(e) => e.stopPropagation()}
        >
          <h3
            className={cn(
              "font-medium line-clamp-2 leading-[1.26] transition-colors hover:text-primary",
              useCompactFooterActions ? "text-[14px]" : "text-[15px]",
              deal.brand ? "mt-1.5" : "mt-0.5",
            )}
          >
            {deal.cleanTitle || deal.title}
          </h3>
        </Link>

        {/* Price and Meta */}
        <div
          className={cn(
            "mt-2.5 border-t border-black/[0.045] pt-2",
            useCompactFooterActions
              ? "flex flex-wrap items-center gap-x-2 gap-y-1.5"
              : "flex items-center justify-between gap-2",
          )}
        >
          {/* Price */}
          <div className="flex min-w-0 items-baseline gap-1.5">
            {dealPrice && (
              <span
                className={cn(
                  "font-bold text-emerald-600",
                  useCompactFooterActions ? "text-[15px]" : "text-base",
                )}
              >
                {getCurrencySymbol(deal.currency)}
                {dealPrice.toLocaleString(
                  deal.currency === "INR" ? "en-IN" : "en-US",
                )}
              </span>
            )}
            {originalPrice && originalPrice > (dealPrice ?? 0) && (
              <span className="text-xs text-muted-foreground line-through">
                {getCurrencySymbol(deal.currency)}
                {originalPrice.toLocaleString(
                  deal.currency === "INR" ? "en-IN" : "en-US",
                )}
              </span>
            )}
          </div>

          {/* Quick actions */}
          <div
            className={cn(
              "flex shrink-0 items-center text-xs text-muted-foreground",
              useCompactFooterActions ? "ml-auto gap-1" : "gap-1.5",
            )}
          >
            <button
              onClick={handleVote}
              className={cn(
                "flex items-center text-muted-foreground transition-[transform,color] duration-200 active:scale-[0.96]",
                useCompactFooterActions
                  ? "gap-0.75 text-[11px]"
                  : "gap-1 text-xs",
                userVote === 1 ? "text-emerald-600" : "hover:text-foreground",
              )}
              title="Upvote deal"
              aria-label="Upvote deal"
            >
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-secondary/72 text-foreground/76 transition-[transform,color,background-color,box-shadow] duration-200",
                  useCompactFooterActions ? "h-7 w-7" : "h-8 w-8",
                  userVote === 1
                    ? "bg-emerald-500/10 text-emerald-600 shadow-[0_10px_18px_-18px_rgba(16,185,129,0.72)]"
                    : "hover:bg-secondary/70 hover:text-foreground",
                )}
              >
                <span
                  key={`vote-icon-${votePulseKey}-${userVote === 1 ? "on" : "off"}`}
                  className={cn("inline-flex", votePulseKey > 0 && "motion-action-pop")}
                >
                  <ArrowUp
                    className={cn(
                      useCompactFooterActions ? "h-3 w-3" : "h-3.5 w-3.5",
                      userVote === 1 && "fill-current",
                    )}
                  />
                </span>
              </span>
              <span
                key={`vote-count-${votePulseKey}-${voteCount}`}
                className={cn("inline-flex", votePulseKey > 0 && "motion-count-bump")}
              >
                {voteCount}
              </span>
            </button>

            <button
              onClick={handleSave}
              className={cn(
                "md:hidden flex shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-secondary/72 text-foreground/76 transition-[transform,color,background-color,box-shadow] duration-200 active:scale-[0.96]",
                useCompactFooterActions ? "h-7 w-7" : "h-8 w-8",
                isSaved
                  ? "bg-primary/10 text-primary shadow-[0_10px_18px_-18px_rgba(124,58,237,0.72)]"
                  : "hover:bg-secondary/70 hover:text-foreground",
              )}
              title={isSaved ? "Unsave deal" : "Save deal"}
              aria-label={isSaved ? "Unsave deal" : "Save deal"}
            >
              <span
                key={`save-mobile-${savePulseKey}-${Number(isSaved)}`}
                className={cn("inline-flex", savePulseKey > 0 && "motion-action-pop")}
              >
                {isSaved ? (
                  <BookmarkCheck
                    className={cn(
                      useCompactFooterActions ? "h-3.25 w-3.25" : "h-3.5 w-3.5",
                    )}
                  />
                ) : (
                  <Bookmark
                    className={cn(
                      useCompactFooterActions ? "h-3.25 w-3.25" : "h-3.5 w-3.5",
                    )}
                  />
                )}
              </span>
            </button>

            <button
              onClick={handleCartToggle}
              className={cn(
                "md:hidden flex shrink-0 items-center justify-center rounded-full border border-black/[0.06] bg-secondary/72 text-foreground/76 transition-[transform,color,background-color,box-shadow] duration-200 active:scale-[0.96]",
                useCompactFooterActions ? "h-7 w-7" : "h-8 w-8",
                isInCart
                  ? "bg-emerald-500/10 text-emerald-600 shadow-[0_10px_18px_-18px_rgba(16,185,129,0.72)]"
                  : "hover:bg-secondary/70 hover:text-foreground",
              )}
              title={isInCart ? "Remove from cart" : "Add to cart"}
              aria-label={isInCart ? "Remove from cart" : "Add to cart"}
            >
              <span
                key={`cart-mobile-${cartPulseKey}-${Number(isInCart)}`}
                className={cn("inline-flex", cartPulseKey > 0 && "motion-action-pop")}
              >
                {isInCart ? (
                  <CheckCircle2
                    className={cn(
                      useCompactFooterActions ? "h-3.25 w-3.25" : "h-3.5 w-3.5",
                    )}
                  />
                ) : (
                  <ShoppingCart
                    className={cn(
                      useCompactFooterActions ? "h-3.25 w-3.25" : "h-3.5 w-3.5",
                    )}
                  />
                )}
              </span>
            </button>

            <Link
              to={`/deal/${deal.id}#comments`}
              onClick={(e) => e.stopPropagation()}
              className="hidden items-center gap-0.5 transition-colors hover:text-foreground md:flex"
              title="View comments"
              aria-label="View comments"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {deal._count?.comments ?? 0}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export const DealCard = memo(
  DealCardComponent,
  (prevProps, nextProps) =>
    prevProps.isPriority === nextProps.isPriority &&
    prevProps.deal === nextProps.deal,
);

export function DealCardSkeleton({ seed = 0 }: { seed?: string | number }) {
  const heightClass = getStableSkeletonHeightClass(seed);

  return (
    <div className="overflow-hidden rounded-[28px] border border-black/[0.075] bg-[linear-gradient(180deg,rgba(255,255,255,0.985),rgba(246,248,251,0.95))] shadow-[0_22px_38px_-30px_rgba(15,23,42,0.22)]">
      <Skeleton className={cn("w-full rounded-none", heightClass)} />
      <div className="pointer-events-none px-3.5">
        <div className="h-px w-full bg-[linear-gradient(90deg,rgba(15,23,42,0),rgba(15,23,42,0.07),rgba(15,23,42,0))]" />
        <div className="flex justify-center">
          <span className="mt-[-1px] block h-[3px] w-12 rounded-full bg-[linear-gradient(90deg,transparent,rgba(214,222,232,0.95),transparent)] opacity-75" />
        </div>
      </div>
      <div className="px-3.5 pb-3 pt-2.5">
        <Skeleton className="mb-2 h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="mt-2 flex justify-between border-t border-black/[0.04] pt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
}

export default DealCard;
