import { useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Bookmark, BookmarkCheck, ArrowUp, ArrowDown, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Deal } from "@/store/filterStore";
import { useAuthStore } from "@/store/authStore";
import { useVoteDeal, useSaveDeal, useTrackClick } from "@/hooks/useDeals";
import { toast } from "sonner";

interface DealCardProps {
  deal: Deal;
}

export function DealCard({ deal }: DealCardProps) {
  const { isAuthenticated } = useAuthStore();
  const voteMutation = useVoteDeal();
  const saveMutation = useSaveDeal();
  const trackClick = useTrackClick();
  
  const [userVote, setUserVote] = useState<number | null>(deal.userUpvote ?? null);
  const [isSaved, setIsSaved] = useState(deal.userSaved ?? false);
  const [voteCount, setVoteCount] = useState(deal.upvoteCount);

  const handleVote = (value: 1 | -1) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to vote");
      return;
    }

    const newValue = userVote === value ? 0 : value;
    const voteDiff = newValue - (userVote ?? 0);
    
    setUserVote(newValue === 0 ? null : newValue);
    setVoteCount((prev) => prev + voteDiff);
    
    voteMutation.mutate({ id: deal.id, value: newValue as 1 | -1 | 0 });
  };

  const handleSave = () => {
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
  const originalPrice = deal.originalPrice ? parseFloat(deal.originalPrice) : null;

  return (
    <Card className="deal-card group overflow-hidden border bg-card hover:shadow-card-hover touch-manipulation">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {deal.imageUrl ? (
          <img
            src={deal.imageUrl}
            alt={deal.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
            <span className="text-4xl">{deal.category.icon || "🏷️"}</span>
          </div>
        )}

        {/* Discount Badge */}
        {deal.discountPercent && deal.discountPercent >= 20 && (
          <Badge
            className={cn(
              "absolute top-2 left-2 font-bold text-xs md:text-sm",
              deal.discountPercent >= 50
                ? "bg-discount-500 hover:bg-discount-600"
                : "bg-deal-500 hover:bg-deal-600"
            )}
          >
            {deal.discountPercent}% OFF
          </Badge>
        )}

        {/* Store Badge */}
        {deal.store && (
          <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
            {deal.store}
          </Badge>
        )}

        {/* Save Button - always visible on mobile */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute bottom-2 right-2 h-9 w-9 md:h-8 md:w-8 rounded-full bg-background/80 backdrop-blur-sm",
            "md:opacity-0 transition-opacity md:group-hover:opacity-100",
            isSaved && "opacity-100 md:opacity-100"
          )}
          onClick={handleSave}
        >
          {isSaved ? (
            <BookmarkCheck className="h-5 w-5 md:h-4 md:w-4 text-primary" />
          ) : (
            <Bookmark className="h-5 w-5 md:h-4 md:w-4" />
          )}
        </Button>
      </div>

      <CardContent className="p-3 md:p-4">
        {/* Category */}
        <div className="mb-2">
          <Badge variant="outline" className="text-[10px] md:text-xs" style={{ borderColor: deal.category.color || undefined }}>
            {deal.category.icon} {deal.category.name}
          </Badge>
        </div>

        {/* Title */}
        <Link to={`/deal/${deal.id}`}>
          <h3 className="font-semibold text-sm line-clamp-2 mb-2 hover:text-primary transition-colors active:text-primary">
            {deal.title}
          </h3>
        </Link>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-3">
          {dealPrice && (
            <span className="text-base md:text-lg font-bold text-deal-600">
              ₹{dealPrice.toLocaleString("en-IN")}
            </span>
          )}
          {originalPrice && originalPrice > (dealPrice ?? 0) && (
            <span className="text-xs md:text-sm text-muted-foreground line-through">
              ₹{originalPrice.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {/* Actions - larger touch targets on mobile */}
        <div className="flex items-center justify-between">
          {/* Vote buttons */}
          <div className="flex items-center gap-0.5 md:gap-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9 md:h-8 md:w-8", userVote === 1 && "text-deal-500")}
              onClick={() => handleVote(1)}
            >
              <ArrowUp className="h-5 w-5 md:h-4 md:w-4" />
            </Button>
            <span className={cn("text-sm font-medium min-w-[24px] text-center", voteCount > 0 && "text-deal-500")}>
              {voteCount}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9 md:h-8 md:w-8", userVote === -1 && "text-discount-500")}
              onClick={() => handleVote(-1)}
            >
              <ArrowDown className="h-5 w-5 md:h-4 md:w-4" />
            </Button>
          </div>

          {/* Comments */}
          <Link to={`/deal/${deal.id}#comments`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground p-2 -m-2">
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{deal._count?.comments ?? 0}</span>
          </Link>

          {/* External Link - larger touch target */}
          <a
            href={deal.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="flex items-center gap-1 text-xs text-primary hover:underline active:underline px-2 py-1 -mx-2"
          >
            View Deal
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export function DealCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[4/3]" />
      <CardContent className="p-3 md:p-4 space-y-3">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}

export default DealCard;
