import { useState } from "react";
import { Link } from "react-router-dom";
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
import { useVoteDeal, useSaveDeal, useTrackClick } from "@/hooks/useDeals";
import { toast } from "sonner";

interface DealCardProps {
  deal: Deal;
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

export function DealCard({ deal }: DealCardProps) {
  const { isAuthenticated } = useAuthStore();
  const voteMutation = useVoteDeal();
  const saveMutation = useSaveDeal();
  const trackClick = useTrackClick();

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

  const handleClick = () => {
    trackClick.mutate(deal.id);
  };

  const dealPrice = deal.dealPrice ? parseFloat(deal.dealPrice) : null;
  const originalPrice = deal.originalPrice
    ? parseFloat(deal.originalPrice)
    : null;

  return (
    <div className="group relative cursor-pointer">
      {/* Image Container - Pinterest style rounded corners, no border */}
      <div className="relative overflow-hidden rounded-2xl bg-secondary">
        {deal.imageUrl ? (
          <img
            src={deal.imageUrl}
            alt={deal.title}
            className="w-full h-auto object-cover transition-all duration-300 group-hover:brightness-[0.85]"
            loading="lazy"
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

        {/* Hover Overlay - Only buttons, no background */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-200">
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
                    href={deal.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleClick}
                  >
                    Visit Store
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Bottom Action - View Deal Button */}
          <div className="absolute bottom-3 left-3 right-3">
            <a
              href={deal.productUrl}
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

      {/* Content - Super minimal */}
      <div className="pt-2 px-1">
        {/* Title */}
        <Link to={`/deal/${deal.id}`}>
          <h3 className="font-medium text-sm line-clamp-2 hover:text-primary transition-colors leading-snug">
            {deal.title}
          </h3>
        </Link>

        {/* Price and Meta */}
        <div className="flex items-center justify-between mt-1.5">
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
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <button
              onClick={handleVote}
              className={cn(
                "flex items-center gap-0.5 hover:text-foreground transition-colors",
                userVote === 1 && "text-emerald-600",
              )}
            >
              <ArrowUp
                className={cn("h-3.5 w-3.5", userVote === 1 && "fill-current")}
              />
              {voteCount}
            </button>

            <Link
              to={`/deal/${deal.id}#comments`}
              className="flex items-center gap-0.5 hover:text-foreground transition-colors"
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

export function DealCardSkeleton() {
  // Random heights for organic masonry feel
  const heights = ["h-32", "h-40", "h-48", "h-56", "h-64"];
  const randomHeight = heights[Math.floor(Math.random() * heights.length)];

  return (
    <div>
      <Skeleton className={cn("w-full rounded-2xl", randomHeight)} />
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
