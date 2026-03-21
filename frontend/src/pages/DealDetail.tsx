import { lazy, Suspense, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import {
  ArrowLeft,
  ExternalLink,
  ArrowUp,
  Share2,
  Bookmark,
  BookmarkCheck,
  Clock,
  Store,
  Tag,
  CheckCircle2,
  LineChart,
  Users,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useDeal,
  useDealPriceHistory,
  useVoteDeal,
  useSaveDeal,
  useTrackClick,
} from "@/hooks/useDeals";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { useDealCartStore } from "@/store/dealCartStore";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import AffiliateDisclosureNote from "@/components/legal/AffiliateDisclosureNote";

const CommentsSection = lazy(() => import("@/components/deals/CommentsSection"));
const PriceHistoryChart = lazy(() => import("@/components/deals/PriceHistoryChart"));

interface UserBadge {
  id: string;
  badge: {
    name: string;
    icon: string;
  };
}

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
  const { ref: secondaryContentRef, inView: shouldLoadSecondaryContent } =
    useInView({
      rootMargin: "600px 0px",
      threshold: 0,
      triggerOnce: true,
    });
  const { isAuthenticated } = useAuthStore();
  const { resetFilters } = useFilterStore();
  const voteMutation = useVoteDeal();
  const saveMutation = useSaveDeal();
  const trackClick = useTrackClick();
  const cartItems = useDealCartStore((state) => state.items);
  const toggleCartDeal = useDealCartStore((state) => state.toggleDeal);
  const { data: priceHistory = [], isLoading: isPriceHistoryLoading } =
    useDealPriceHistory(id || "", {
      enabled: !!id && shouldLoadSecondaryContent,
      limit: 30,
    });

  const [submitterBadges, setSubmitterBadges] = useState<UserBadge[]>([]);

  useEffect(() => {
    if (deal?.submittedBy?.id) {
      api
        .getUserBadges(deal.submittedBy.id)
        .then((res) => {
          const response = res as { success: boolean; data: UserBadge[] };
          if (response.success) {
            setSubmitterBadges(response.data);
          }
        })
        .catch(() => {
          setSubmitterBadges([]);
        });
    }
  }, [deal]);

  const handleVote = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to vote");
      return;
    }

    const currentVote = deal!.userUpvote ?? null;
    const newValue = currentVote === 1 ? 0 : 1;

    voteMutation.mutate({ id: deal!.id, value: newValue as 1 | 0 });
  };

  const handleSave = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to save deals");
      return;
    }

    const wasSaved = !!deal?.userSaved;
    saveMutation.mutate(deal!.id);
    toast.success(wasSaved ? "Removed from saved" : "Deal saved!");
  };

  const isSaved = !!deal?.userSaved;
  const isInCart = !!deal && cartItems.some((item) => item.id === deal.id);

  const handleCartToggle = () => {
    toggleCartDeal(deal!);
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
      <div className="bg-background">
        <Header />
        <div>
          <header className="border-b bg-background md:sticky md:top-16 md:z-40 md:bg-background/95 md:backdrop-blur md:supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4 md:h-16 md:px-8">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
                onClick={resetFilters}
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-medium">Back</span>
              </Link>
            </div>
          </header>

          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
              <div className="space-y-6">
                <Skeleton className="aspect-[4/3] rounded-2xl" />
                <Skeleton className="h-64 rounded-2xl" />
                <Skeleton className="h-56 rounded-2xl" />
              </div>
              <Skeleton className="h-[420px] rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="bg-background">
        <Header />
        <div>
          <header className="border-b bg-background md:sticky md:top-16 md:z-40 md:bg-background/95 md:backdrop-blur md:supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4 md:h-16 md:px-8">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
                onClick={resetFilters}
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
            <Link to="/" onClick={resetFilters}>
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Deals
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const dealPrice = deal.dealPrice ? parseFloat(deal.dealPrice) : null;
  const originalPrice = deal.originalPrice
    ? parseFloat(deal.originalPrice)
    : null;
  const locale = deal.currency === "INR" ? "en-IN" : "en-US";

  const formatMoney = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return "N/A";
    return `${getCurrencySymbol(deal.currency)}${value.toLocaleString(locale)}`;
  };

  const pricePoints = priceHistory
    .map((entry) => Number.parseFloat(entry.price))
    .filter((value) => Number.isFinite(value));

  const latestTrackedPrice = pricePoints.length
    ? pricePoints[pricePoints.length - 1]
    : null;
  const lowestTrackedPrice = pricePoints.length
    ? Math.min(...pricePoints)
    : null;
  const trackerDelta =
    latestTrackedPrice !== null && lowestTrackedPrice !== null
      ? latestTrackedPrice - lowestTrackedPrice
      : null;

  return (
    <div className="bg-background">
      <Header />
      <div>
        <header className="border-b bg-background md:sticky md:top-16 md:z-40 md:bg-background/95 md:backdrop-blur md:supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-4 md:h-16 md:px-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={resetFilters}
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back</span>
            </Link>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-10">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start">
            <section className="space-y-6 min-w-0">
              <div className="relative mx-auto w-full max-w-[860px] overflow-hidden rounded-2xl border bg-secondary">
                {deal.imageUrl ? (
                  <div className="flex w-full justify-center bg-secondary/60">
                    <img
                      src={deal.imageUrl}
                      alt={deal.title}
                      className="h-auto w-full object-contain max-h-[68vh]"
                    />
                  </div>
                ) : (
                  <div
                    className="w-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-primary/20 to-primary/30"
                    style={{ aspectRatio: "4/5" }}
                  >
                    <span className="text-8xl">{"🏷️"}</span>
                  </div>
                )}

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

              <section className="rounded-2xl border bg-card p-5 md:p-7 space-y-6">
                <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                  {deal.title}
                </h1>

                <div className="flex items-end gap-3 flex-wrap">
                  {dealPrice ? (
                    <span className="text-3xl font-bold text-emerald-600">
                      {formatMoney(dealPrice)}
                    </span>
                  ) : (
                    <span className="text-xl font-semibold">Check store pricing</span>
                  )}
                  {originalPrice && originalPrice > (dealPrice ?? 0) && (
                    <span className="text-xl text-muted-foreground line-through">
                      {formatMoney(originalPrice)}
                    </span>
                  )}
                  {originalPrice && dealPrice && originalPrice > dealPrice && (
                    <Badge variant="outline" className="font-medium">
                      Save {formatMoney(originalPrice - dealPrice)}
                    </Badge>
                  )}
                </div>

                {deal.description && (
                  <p className="text-muted-foreground leading-relaxed">
                    {deal.description}
                  </p>
                )}

                <div className="lg:hidden space-y-3 pt-1">
                  <a
                    href={deal.affiliateUrl ?? deal.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleVisitStore}
                    className="block"
                  >
                    <Button size="lg" className="w-full gap-2 text-base">
                      Purchase Now
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                  <AffiliateDisclosureNote className="px-1" />

                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      size="lg"
                      variant={deal.userUpvote === 1 ? "default" : "outline"}
                      onClick={handleVote}
                      className="gap-2"
                      title="Upvote deal"
                      aria-label="Upvote deal"
                    >
                      <ArrowUp
                        className={cn(
                          "h-4 w-4",
                          deal.userUpvote === 1 && "fill-current",
                        )}
                      />
                      {deal.upvoteCount}
                    </Button>

                    <Button
                      size="lg"
                      variant={isSaved ? "default" : "outline"}
                      onClick={handleSave}
                      className="gap-2"
                      title={isSaved ? "Unsave deal" : "Save deal"}
                      aria-label={isSaved ? "Unsave deal" : "Save deal"}
                    >
                      {isSaved ? (
                        <BookmarkCheck className="h-4 w-4" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">
                        {isSaved ? "Saved" : "Save"}
                      </span>
                    </Button>

                    <Button
                      size="lg"
                      variant={isInCart ? "default" : "outline"}
                      onClick={handleCartToggle}
                      className="gap-2"
                      title={isInCart ? "Remove from cart" : "Add to cart"}
                      aria-label={isInCart ? "Remove from cart" : "Add to cart"}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {isInCart ? "In cart" : "Add"}
                      </span>
                    </Button>

                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handleShare}
                      title="Share deal"
                      aria-label="Share deal"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="rounded-xl border bg-secondary/40 p-3 space-y-1.5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Community votes and saves update in real time.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-primary" />
                      <span>You are redirected to the official store page.</span>
                    </div>
                  </div>
                </div>
              </section>

              <section
                ref={secondaryContentRef}
                id="price-history"
                className="rounded-2xl border bg-card p-5 md:p-7"
              >
                <h3 className="text-lg font-semibold mb-4">Price History</h3>
                {shouldLoadSecondaryContent ? (
                  <Suspense
                    fallback={
                      <div className="space-y-3">
                        <Skeleton className="h-56 w-full rounded-xl" />
                      </div>
                    }
                  >
                    {isPriceHistoryLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-56 w-full rounded-xl" />
                      </div>
                    ) : priceHistory.length > 0 ? (
                      <PriceHistoryChart
                        data={priceHistory}
                        currency={deal.currency}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No tracked price history for this deal yet.
                      </p>
                    )}
                  </Suspense>
                ) : (
                  <div className="space-y-2">
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <p className="text-xs text-muted-foreground">
                      Price history loads as you scroll.
                    </p>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border bg-card p-5 md:p-7 space-y-4">
                <h3 className="text-lg font-semibold">Deal Details</h3>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border bg-secondary/35 px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Category
                    </p>
                    <p className="mt-1 font-medium flex items-center gap-1.5">
                      <Tag className="h-4 w-4" />
                      {deal.category.name}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-secondary/35 px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Store
                    </p>
                    <p className="mt-1 font-medium flex items-center gap-1.5">
                      <Store className="h-4 w-4" />
                      {deal.store || "Unknown"}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-secondary/35 px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Posted
                    </p>
                    <p className="mt-1 font-medium flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {formatTimeAgo(deal.createdAt)}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-secondary/35 px-3 py-2.5">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Community Score
                    </p>
                    <p className="mt-1 font-medium flex items-center gap-1.5">
                      <ArrowUp className="h-4 w-4" />
                      {deal.upvoteCount} votes
                    </p>
                  </div>
                </div>

                {deal.submittedBy && (
                  <div className="pt-2 border-t">
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
                      {submitterBadges.map((ub) => (
                        <span
                          key={ub.id}
                          title={ub.badge.name}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-xs"
                        >
                          {ub.badge.icon}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </section>

            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-2xl border bg-card p-5 shadow-sm space-y-5">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    Best current price
                  </p>
                  <p className="mt-1 text-3xl font-bold text-emerald-600">
                    {dealPrice ? formatMoney(dealPrice) : "Check store price"}
                  </p>
                  {originalPrice && originalPrice > (dealPrice ?? 0) && (
                    <p className="text-sm text-muted-foreground line-through mt-1">
                      {formatMoney(originalPrice)}
                    </p>
                  )}
                </div>

                <a
                  href={deal.affiliateUrl ?? deal.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleVisitStore}
                  className="block"
                >
                  <Button size="lg" className="w-full gap-2 text-base">
                    Purchase Now
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
                <AffiliateDisclosureNote />

                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant={deal.userUpvote === 1 ? "default" : "outline"}
                    onClick={handleVote}
                    className="gap-1.5"
                    title="Upvote deal"
                    aria-label="Upvote deal"
                  >
                    <ArrowUp
                      className={cn(
                        "h-4 w-4",
                        deal.userUpvote === 1 && "fill-current",
                      )}
                    />
                    {deal.upvoteCount}
                  </Button>

                  <Button
                    variant={isSaved ? "default" : "outline"}
                    onClick={handleSave}
                    className="gap-1.5"
                    title={isSaved ? "Unsave deal" : "Save deal"}
                    aria-label={isSaved ? "Unsave deal" : "Save deal"}
                  >
                    {isSaved ? (
                      <BookmarkCheck className="h-4 w-4" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                    <span className="hidden xl:inline">
                      {isSaved ? "Saved" : "Save"}
                    </span>
                  </Button>

                  <Button
                    variant={isInCart ? "default" : "outline"}
                    onClick={handleCartToggle}
                    className="gap-1.5"
                    title={isInCart ? "Remove from cart" : "Add to cart"}
                    aria-label={isInCart ? "Remove from cart" : "Add to cart"}
                  >
                    <ShoppingCart className="h-4 w-4" />
                    <span className="hidden xl:inline">
                      {isInCart ? "In cart" : "Add"}
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={handleShare}
                    title="Share deal"
                    aria-label="Share deal"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="rounded-xl border bg-secondary/40 p-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Trust cues
                  </p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-foreground/90">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Community-verified engagement signals.
                    </div>
                    <div className="flex items-center gap-2 text-foreground/90">
                      <Store className="h-4 w-4 text-primary" />
                      Direct redirect to official merchant listing.
                    </div>
                    <div className="flex items-center gap-2 text-foreground/90">
                      <Users className="h-4 w-4 text-sky-600" />
                      Submitted and tracked by SaveKaro users.
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-secondary/40 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-1.5">
                      <LineChart className="h-3.5 w-3.5" />
                      Price summary
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {priceHistory.length} pts
                    </span>
                  </div>

                  {pricePoints.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-background/80 p-2">
                        <p className="text-[11px] text-muted-foreground">Latest</p>
                        <p className="font-semibold">{formatMoney(latestTrackedPrice)}</p>
                      </div>
                      <div className="rounded-lg bg-background/80 p-2">
                        <p className="text-[11px] text-muted-foreground">Lowest</p>
                        <p className="font-semibold">{formatMoney(lowestTrackedPrice)}</p>
                      </div>
                      <div className="rounded-lg bg-background/80 p-2 col-span-2">
                        <p className="text-[11px] text-muted-foreground">Movement</p>
                        <p className="font-semibold">
                          {trackerDelta !== null
                            ? `${trackerDelta > 0 ? "+" : ""}${formatMoney(trackerDelta).replace(getCurrencySymbol(deal.currency), "")}`
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {shouldLoadSecondaryContent
                        ? "No tracked history yet for this deal."
                        : "Scroll to load full history and chart."}
                    </p>
                  )}
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-12" id="comments">
            {shouldLoadSecondaryContent ? (
              <Suspense
                fallback={
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-44" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                  </div>
                }
              >
                <CommentsSection dealId={deal.id} />
              </Suspense>
            ) : (
              <div className="space-y-4">
                <Skeleton className="h-8 w-44" />
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
