import {
  ArrowUp,
  Share2,
  Bookmark,
  BookmarkCheck,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DealActionButtonsProps {
  upvoteCount: number;
  userUpvote: number | null | undefined;
  isSaved: boolean;
  isInCart: boolean;
  onVote: () => void;
  onSave: () => void;
  onCartToggle: () => void;
  onShare: () => void;
  /** Button size — mobile uses "lg", sidebar uses "default". */
  size?: "sm" | "default" | "lg";
  /** Class name for the label text shown on wider screens. */
  labelBreakpoint?: string;
}

export function DealActionButtons({
  upvoteCount,
  userUpvote,
  isSaved,
  isInCart,
  onVote,
  onSave,
  onCartToggle,
  onShare,
  size = "default",
  labelBreakpoint = "hidden xl:inline",
}: DealActionButtonsProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <Button
        size={size}
        variant={userUpvote === 1 ? "default" : "outline"}
        onClick={onVote}
        className={size === "lg" ? "gap-2" : "gap-1.5"}
        title="Upvote deal"
        aria-label="Upvote deal"
      >
        <ArrowUp
          className={cn(
            "h-4 w-4",
            userUpvote === 1 && "fill-current",
          )}
        />
        {upvoteCount}
      </Button>

      <Button
        size={size}
        variant={isSaved ? "default" : "outline"}
        onClick={onSave}
        className={size === "lg" ? "gap-2" : "gap-1.5"}
        title={isSaved ? "Unsave deal" : "Save deal"}
        aria-label={isSaved ? "Unsave deal" : "Save deal"}
      >
        {isSaved ? (
          <BookmarkCheck className="h-4 w-4" />
        ) : (
          <Bookmark className="h-4 w-4" />
        )}
        <span className={labelBreakpoint}>
          {isSaved ? "Saved" : "Save"}
        </span>
      </Button>

      <Button
        size={size}
        variant={isInCart ? "default" : "outline"}
        onClick={onCartToggle}
        className={size === "lg" ? "gap-2" : "gap-1.5"}
        title={isInCart ? "Remove from cart" : "Add to cart"}
        aria-label={isInCart ? "Remove from cart" : "Add to cart"}
      >
        <ShoppingCart className="h-4 w-4" />
        <span className={labelBreakpoint}>
          {isInCart ? "In cart" : "Add"}
        </span>
      </Button>

      <Button
        size={size}
        variant="outline"
        onClick={onShare}
        title="Share deal"
        aria-label="Share deal"
      >
        <Share2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
