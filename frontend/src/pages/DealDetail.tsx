import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  ArrowUp,
  Bookmark,
  BookmarkCheck,
  Share2,
  Clock,
  Store,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useDeal,
  useVoteDeal,
  useSaveDeal,
  useTrackClick,
} from "@/hooks/useDeals";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import CommentsSection from "@/components/deals/CommentsSection";
import PriceHistoryChart from "@/components/deals/PriceHistoryChart";
import { IconRail } from "@/components/layout/IconRail";
import { BottomNav } from "@/components/layout/BottomNav";

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

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return "Just now";
};

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: deal, isLoading, error } = useDeal(id || "");
  const { isAuthenticated } = useAuthStore();
  const voteMutation = useVoteDeal();
  const saveMutation = useSaveDeal();
  const trackClick = useTrackClick();

  const [userVote, setUserVote] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [initialized, setInitialized] = useState(false);

  // Update local state when deal loads
  useEffect(() => {
    if (deal && !initialized) {
      setUserVote(deal.userUpvote ?? null);
      setIsSaved(deal.userSaved ?? false);
      setVoteCount(deal.upvoteCount);
      setInitialized(true);
    }
  }, [deal, initialized]);

  const handleVote = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to vote");
      return;
    }

    const newValue = userVote === 1 ? 0 : 1;
    const voteDiff = newValue - (userVote ?? 0);

    setUserVote(newValue === 0 ? null : 1);
    setVoteCount((prev) => prev + voteDiff);

    voteMutation.mutate({ id: deal!.id, value: newValue as 1 | 0 });
  };

  const handleSave = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to save deals");
      return;
    }

    setIsSaved(!isSaved);
    saveMutation.mutate(deal!.id);
    toast.success(isSaved ? "Removed from saved" : "Deal saved!");
  };

  const handleVisitStore = () => {
    trackClick.mutate(deal!.id);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied to clipboard!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <IconRail />
        <div className="md:ml-24">
          <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
            <div className="flex items-center h-16 px-4 md:px-8">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-medium">Back</span>
              </Link>
            </div>
          </header>
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="grid md:grid-cols-2 gap-8">
              <Skeleton className="aspect-square rounded-2xl" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="min-h-screen bg-background">
        <IconRail />
        <div className="md:ml-24">
          <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
            <div className="flex items-center h-16 px-4 md:px-8">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-medium">Back</span>
              </Link>
            </div>
          </header>
          <div className="max-w-4xl mx-auto px-4 py-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Deal not found</h1>
            <p className="text-muted-foreground mb-6">
              This deal may have been removed or the link is incorrect.
            </p>
            <Link to="/">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Deals
              </Button>
            </Link>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const dealPrice = deal.dealPrice ? parseFloat(deal.dealPrice) : null;
  const originalPrice = deal.originalPrice
    ? parseFloat(deal.originalPrice)
    : null;

  return (
    <div className="min-h-screen bg-background">
      <IconRail />
      <div className="md:ml-24">
        {/* Minimal Header - matches Home page styling */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center h-16 px-4 md:px-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back</span>
            </Link>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-6 pb-24 md:pb-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left - Image */}
            <div className="relative">
              <div className="sticky top-24">
                <div className="relative overflow-hidden rounded-2xl bg-secondary">
                  {deal.imageUrl ? (
                    <img
                      src={deal.imageUrl}
                      alt={deal.title}
                      className="w-full h-auto object-cover"
                      style={{ maxHeight: "600px" }}
                    />
                  ) : (
                    <div
                      className="w-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-primary/20 to-primary/30"
                      style={{ aspectRatio: "4/5" }}
                    >
                      <span className="text-8xl">
                        {deal.category.icon || "🏷️"}
                      </span>
                    </div>
                  )}

                  {/* Discount badge */}
                  {deal.discountPercent && deal.discountPercent >= 20 && (
                    <Badge
                      className={cn(
                        "absolute top-4 left-4 font-bold text-lg rounded-full shadow-lg px-4 py-1",
                        deal.discountPercent >= 50
                          ? "bg-red-500 hover:bg-red-600"
                          : "bg-emerald-500 hover:bg-emerald-600",
                      )}
                    >
                      {deal.discountPercent}% OFF
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Right - Details */}
            <div className="space-y-6">
              {/* Category & Store */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {deal.category.name}
                </Badge>
                {deal.store && (
                  <Badge variant="outline" className="gap-1">
                    <Store className="h-3 w-3" />
                    {deal.store}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTimeAgo(deal.createdAt)}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                {deal.title}
              </h1>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                {dealPrice && (
                  <span className="text-3xl font-bold text-emerald-600">
                    {getCurrencySymbol(deal.currency)}
                    {dealPrice.toLocaleString(
                      deal.currency === "INR" ? "en-IN" : "en-US",
                    )}
                  </span>
                )}
                {originalPrice && originalPrice > (dealPrice ?? 0) && (
                  <span className="text-xl text-muted-foreground line-through">
                    {getCurrencySymbol(deal.currency)}
                    {originalPrice.toLocaleString(
                      deal.currency === "INR" ? "en-IN" : "en-US",
                    )}
                  </span>
                )}
              </div>

              {/* Description */}
              {deal.description && (
                <p className="text-muted-foreground leading-relaxed">
                  {deal.description}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <a
                  href={deal.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleVisitStore}
                  className="flex-1 min-w-[200px]"
                >
                  <Button size="lg" className="w-full gap-2 text-base">
                    Purchase Now
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>

                <Button
                  size="lg"
                  variant={userVote === 1 ? "default" : "outline"}
                  onClick={handleVote}
                  className="gap-2"
                >
                  <ArrowUp
                    className={cn("h-5 w-5", userVote === 1 && "fill-current")}
                  />
                  {voteCount || deal.upvoteCount}
                </Button>

                <Button
                  size="lg"
                  variant={isSaved ? "default" : "outline"}
                  onClick={handleSave}
                >
                  {isSaved ? (
                    <BookmarkCheck className="h-5 w-5" />
                  ) : (
                    <Bookmark className="h-5 w-5" />
                  )}
                </Button>

                <Button size="lg" variant="outline" onClick={handleShare}>
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>

              {/* Submitted by */}
              {deal.submittedBy && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Submitted by</span>
                  {deal.submittedBy.avatarUrl && (
                    <img
                      src={deal.submittedBy.avatarUrl}
                      alt=""
                      className="h-5 w-5 rounded-full"
                    />
                  )}
                  <span className="font-medium text-foreground">
                    {deal.submittedBy.name || "Anonymous"}
                  </span>
                </div>
              )}

              {/* Price History */}
              {deal.priceHistory && deal.priceHistory.length > 0 && (
                <div className="pt-4">
                  <h3 className="text-lg font-semibold mb-4">Price History</h3>
                  <PriceHistoryChart
                    data={deal.priceHistory}
                    currency={deal.currency}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="mt-12" id="comments">
            <CommentsSection dealId={deal.id} />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
