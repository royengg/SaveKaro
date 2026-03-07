import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  ArrowUp,
  MoreHorizontal,
  MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Deal } from "@/store/filterStore";
import { useAuthStore } from "@/store/authStore";
import {
  useVoteDeal,
  useSaveDeal,
  useTrackClick,
  useDeleteDeal,
} from "@/hooks/useDeals";
import { toast } from "sonner";

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

export function DealCard({ deal, isPriority = false }: DealCardProps) {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const voteMutation = useVoteDeal();
  const saveMutation = useSaveDeal();
  const trackClick = useTrackClick();
  const deleteMutation = useDeleteDeal();

  const [userVote, setUserVote] = useState<number | null>(
    deal.userUpvote ?? null,
  );
  const [isSaved, setIsSaved] = useState(deal.userSaved ?? false);
  const [voteCount, setVoteCount] = useState(deal.upvoteCount);

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
    saveMutation.mutate(deal.id);
    toast.success(isSaved ? "Removed from saved" : "Deal saved!");
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackClick.mutate(deal.id);
  };

  const handleCardClick = () => {
    navigate(`/deal/${deal.id}`);
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
    <div className="group relative cursor-pointer deal-hover-lift">
      {/* Image Container - Pinterest style rounded corners, no border */}
      <div onClick={handleCardClick} className="block">
        <div className="relative overflow-hidden rounded-2xl bg-secondary">
          {deal.imageUrl ? (
            <img
              src={deal.imageUrl}
              alt={deal.title}
              className="w-full h-auto object-cover transition-all duration-200 group-hover:brightness-[0.85]"
              loading={isPriority ? "eager" : "lazy"}
              // Adding fetchPriority for LCP optimization
              fetchPriority={isPriority ? "high" : "auto"}
              style={{ minHeight: "100px", maxHeight: "400px" }}
            />
          ) : (
            <div
              className="w-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-primary/20 to-primary/30"
              style={{ aspectRatio: "4/5" }}
            >
              <span className="text-6xl">{deal.category.icon || "🏷️"}</span>
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
                  "h-10 w-10 rounded-full shadow-lg transition-transform hover:scale-105",
                  isSaved
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/95 hover:bg-white text-foreground",
                )}
                onClick={handleSave}
                title={isSaved ? "Unsave deal" : "Save deal"}
                aria-label={isSaved ? "Unsave deal" : "Save deal"}
              >
                {isSaved ? (
                  <BookmarkCheck className="h-5 w-5" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    className="h-10 w-10 rounded-full bg-white/95 hover:bg-white text-foreground shadow-lg transition-transform hover:scale-105"
                    title="More actions"
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={`/deal/${deal.id}`}>View Details</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href={deal.affiliateUrl ?? deal.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleClick}
                    >
                      Visit Store
                    </a>
                  </DropdownMenuItem>
                  {user?.isAdmin && (
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                    >
                      Delete Deal
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Bottom Action - View Deal Button */}
            <div className="absolute bottom-3 left-3 right-3">
              <a
                href={deal.affiliateUrl ?? deal.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClick}
              >
                <Button className="w-full rounded-full shadow-lg font-semibold gap-2 h-11">
                  View Deal
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Content - Super minimal */}
      <div className="pt-2 px-1">
        {/* Brand Badge */}
        {deal.brand && (
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {deal.brand}
          </span>
        )}

        {/* Title - use cleanTitle if available */}
        <Link to={`/deal/${deal.id}`}>
          <h3 className="font-medium text-sm line-clamp-2 hover:text-primary transition-colors leading-snug">
            {deal.cleanTitle || deal.title}
          </h3>
        </Link>

        {/* Price and Meta */}
        <div className="flex items-center justify-between mt-1.5 gap-2">
          {/* Price */}
          <div className="flex items-baseline gap-1.5">
            {dealPrice && (
              <span className="font-bold text-emerald-600">
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
          <div className="flex items-center gap-2 text-muted-foreground text-xs shrink-0">
            <button
              onClick={handleVote}
              className={cn(
                "flex items-center gap-0.5 hover:text-foreground transition-colors",
                userVote === 1 && "text-emerald-600",
              )}
              title="Upvote deal"
              aria-label="Upvote deal"
            >
              <ArrowUp
                className={cn("h-3.5 w-3.5", userVote === 1 && "fill-current")}
              />
              {voteCount}
            </button>

            <button
              onClick={handleSave}
              className={cn(
                "md:hidden flex items-center gap-0.5 hover:text-foreground transition-colors",
                isSaved && "text-primary",
              )}
              title={isSaved ? "Unsave deal" : "Save deal"}
              aria-label={isSaved ? "Unsave deal" : "Save deal"}
            >
              {isSaved ? (
                <BookmarkCheck className="h-3.5 w-3.5" />
              ) : (
                <Bookmark className="h-3.5 w-3.5" />
              )}
            </button>

            <Link
              to={`/deal/${deal.id}#comments`}
              className="flex items-center gap-0.5 hover:text-foreground transition-colors"
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

export function DealCardSkeleton({ seed = 0 }: { seed?: string | number }) {
  const heightClass = getStableSkeletonHeightClass(seed);

  return (
    <div>
      <Skeleton className={cn("w-full rounded-2xl", heightClass)} />
      <div className="pt-2 px-1 space-y-1.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
}

export default DealCard;
