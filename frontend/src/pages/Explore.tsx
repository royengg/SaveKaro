import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUp,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  ThumbsUp,
  Clock,
  ChevronUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useDeals,
  useSaveDeal,
  useVoteDeal,
  useTrackClick,
} from "@/hooks/useDeals";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { toast } from "sonner";

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

// A single full-screen deal card — renders the deal content
function DealCard({
  deal,
  isSaved,
  onSave,
  onVote,
  onViewDetails,
  onVisitStore,
}: {
  deal: any;
  isSaved: boolean;
  onSave: () => void;
  onVote: () => void;
  onViewDetails: () => void;
  onVisitStore: () => void;
}) {
  return (
    <div className="absolute inset-0 bg-black">
      {/* Background Image */}
      <div className="absolute inset-0">
        {deal.imageUrl ? (
          <img
            src={deal.imageUrl}
            alt={deal.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/50 to-primary/70 flex items-center justify-center">
            <span className="text-9xl">{"🏷️"}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/50" />
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 pb-24">
        {/* Category & Store */}
        <div className="flex items-center gap-2 mb-3">
          <Badge className="bg-white/20 text-white border-0">
            {deal.category?.name}
          </Badge>
          <Badge variant="outline" className="text-white border-white/30">
            {deal.store}
          </Badge>
        </div>

        {/* Title */}
        <h1
          className="text-2xl md:text-3xl font-bold text-white mb-4 line-clamp-3 cursor-pointer"
          onClick={onViewDetails}
        >
          {deal.title}
        </h1>

        {/* Price */}
        <div className="flex items-baseline gap-3 mb-4">
          {deal.dealPrice && (
            <span className="text-3xl font-bold text-white">
              ₹{parseFloat(deal.dealPrice).toLocaleString()}
            </span>
          )}
          {deal.originalPrice && (
            <span className="text-xl text-white/50 line-through">
              ₹{parseFloat(deal.originalPrice).toLocaleString()}
            </span>
          )}
          {deal.discountPercent && deal.discountPercent >= 10 && (
            <Badge className="bg-red-500 text-white border-0 text-lg px-3">
              {deal.discountPercent}% OFF
            </Badge>
          )}
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 text-white/70 text-sm mb-6">
          <div className="flex items-center gap-1.5">
            <ThumbsUp className="h-4 w-4" />
            <span>{deal.upvoteCount || 0} votes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{formatTimeAgo(deal.createdAt)}</span>
          </div>
        </div>

        {/* CTA Button */}
        <Button
          size="lg"
          className="w-full rounded-full font-semibold gap-2 h-14 text-lg"
          onClick={onVisitStore}
        >
          Visit Store
          <ExternalLink className="h-5 w-5" />
        </Button>
      </div>

      {/* Side Actions */}
      <div className="absolute right-4 bottom-40 flex flex-col gap-4">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full bg-white/20 text-white hover:bg-white/30",
            isSaved && "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
          onClick={onSave}
        >
          {isSaved ? (
            <BookmarkCheck className="h-6 w-6" />
          ) : (
            <Bookmark className="h-6 w-6" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-14 w-14 rounded-full bg-white/20 text-white hover:bg-white/30"
          onClick={onVote}
        >
          <ArrowUp className="h-6 w-6" />
        </Button>
      </div>

      {/* Swipe Hint */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-6 flex flex-col items-center text-white/50 text-xs">
        <ChevronUp className="h-4 w-4 animate-bounce" />
        <span>Swipe up for next</span>
      </div>
    </div>
  );
}

export function Explore() {
  const navigate = useNavigate();
  const { region } = useFilterStore();
  const { isAuthenticated } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedDeals, setSavedDeals] = useState<Set<string>>(new Set());

  // Animation state: null=idle, "next"=scrolling to next, "prev"=scrolling to prev
  const [animating, setAnimating] = useState<"next" | "prev" | null>(null);
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Touch tracking
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [touchDelta, setTouchDelta] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isLoading } = useDeals({
    sortBy: "popular",
    region,
  });

  const saveMutation = useSaveDeal();
  const voteMutation = useVoteDeal();
  const trackClick = useTrackClick();

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const allDeals = useMemo(() => {
    const deals = data?.pages.flatMap((page) => page.data) || [];
    return shuffleArray(deals);
  }, [data?.pages]);

  const currentDeal = allDeals[currentIndex];
  const nextDeal = allDeals[currentIndex + 1];
  const prevDeal = allDeals[currentIndex - 1];

  useEffect(() => {
    if (currentIndex >= allDeals.length - 3 && hasNextPage) {
      fetchNextPage();
    }
  }, [currentIndex, allDeals.length, hasNextPage, fetchNextPage]);

  const lockScroll = useCallback(() => {
    if (isScrolling.current) return false;
    isScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      isScrolling.current = false;
    }, 500);
    return true;
  }, []);

  const goToNext = useCallback(() => {
    if (currentIndex >= allDeals.length - 1) return;
    if (!lockScroll()) return;
    setAnimating("next");
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setAnimating(null);
    }, 350);
  }, [currentIndex, allDeals.length, lockScroll]);

  const goToPrevious = useCallback(() => {
    if (currentIndex <= 0) return;
    if (!lockScroll()) return;
    setAnimating("prev");
    setTimeout(() => {
      setCurrentIndex((prev) => prev - 1);
      setAnimating(null);
    }, 350);
  }, [currentIndex, lockScroll]);

  const handleSave = useCallback(() => {
    if (!currentDeal) return;
    if (!isAuthenticated) {
      toast.error("Please sign in to save deals");
      return;
    }
    const isSaved = savedDeals.has(currentDeal.id);
    if (isSaved) {
      setSavedDeals((prev) => {
        const next = new Set(prev);
        next.delete(currentDeal.id);
        return next;
      });
    } else {
      setSavedDeals((prev) => new Set(prev).add(currentDeal.id));
    }
    saveMutation.mutate(currentDeal.id);
    toast.success(isSaved ? "Removed from saved" : "Deal saved!");
  }, [currentDeal, isAuthenticated, savedDeals, saveMutation]);

  const handleVote = useCallback(() => {
    if (!currentDeal) return;
    if (!isAuthenticated) {
      toast.error("Please sign in to vote");
      return;
    }
    voteMutation.mutate({ id: currentDeal.id, value: 1 });
    toast.success("Voted!");
  }, [currentDeal, isAuthenticated, voteMutation]);

  const handleViewDetails = useCallback(() => {
    if (currentDeal) navigate(`/deal/${currentDeal.id}`);
  }, [currentDeal, navigate]);

  const handleVisitStore = useCallback(() => {
    if (currentDeal) {
      trackClick.mutate(currentDeal.id);
      window.open(currentDeal.affiliateUrl ?? currentDeal.productUrl, "_blank");
    }
  }, [currentDeal, trackClick]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setTouchDelta({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || animating) return;
    const deltaX = e.touches[0].clientX - touchStart.x;
    const deltaY = e.touches[0].clientY - touchStart.y;
    setTouchDelta({ x: deltaX, y: deltaY });
    if (Math.abs(deltaY) > 10 || Math.abs(deltaX) > 10) setIsDragging(true);
  };

  const handleTouchEnd = () => {
    if (!touchStart) return;
    const threshold = 60;
    if (Math.abs(touchDelta.y) > Math.abs(touchDelta.x)) {
      if (touchDelta.y < -threshold) goToNext();
      else if (touchDelta.y > threshold) goToPrevious();
    } else {
      if (touchDelta.x > threshold) handleSave();
    }
    setTouchStart(null);
    setTouchDelta({ x: 0, y: 0 });
    setIsDragging(false);
  };

  // Wheel scroll
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (isScrolling.current) return;
      if (Math.abs(e.deltaY) < 30) return;
      if (e.deltaY > 0) goToNext();
      else goToPrevious();
    },
    [goToNext, goToPrevious],
  );

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
        case "k":
          e.preventDefault();
          goToPrevious();
          break;
        case "ArrowDown":
        case "j":
        case " ":
          e.preventDefault();
          goToNext();
          break;
        case "ArrowRight":
        case "s":
          e.preventDefault();
          handleSave();
          break;
        case "Enter":
          e.preventDefault();
          handleViewDetails();
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNext, goToPrevious, handleSave, handleViewDetails]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading deals...</p>
        </div>
      </div>
    );
  }

  if (!currentDeal) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-medium mb-2">No deals to explore</p>
          <p className="text-muted-foreground mb-4">Check back later!</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const isSaved = savedDeals.has(currentDeal.id);

  // Compute live drag translate (only for y-axis vertical drag, like Instagram rubber banding)
  const dragY =
    isDragging && Math.abs(touchDelta.y) > Math.abs(touchDelta.x)
      ? touchDelta.y * 0.35
      : 0;
  const dragX =
    isDragging && Math.abs(touchDelta.x) > Math.abs(touchDelta.y)
      ? touchDelta.x * 0.35
      : 0;

  return (
    <div
      ref={containerRef}
      className="fixed top-0 left-0 w-full h-[100dvh] bg-black overflow-hidden select-none touch-none overscroll-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 z-50 text-white hover:bg-white/20"
        onClick={() => navigate("/")}
      >
        <X className="h-6 w-6" />
      </Button>

      {/*
        Instagram Reels-style: two cards layered.
        Current card: exits UP when going next, exits DOWN when going prev.
        Next card: enters from BELOW (100% down) when going next.
        Prev card: enters from ABOVE when going prev.
        On drag: current card follows finger vertically (rubber band).
      */}

      {/* --- NEXT CARD (slides in from bottom during "next" animation) --- */}
      {nextDeal && animating === "next" && (
        <div
          className="absolute inset-0"
          style={{
            transform:
              animating === "next" ? "translateY(0)" : "translateY(100%)",
            transition: "transform 350ms cubic-bezier(0.32, 0.72, 0, 1)",
            animation:
              "slideInFromBottom 350ms cubic-bezier(0.32, 0.72, 0, 1) forwards",
          }}
        >
          <DealCard
            deal={nextDeal}
            isSaved={savedDeals.has(nextDeal.id)}
            onSave={() => {}}
            onVote={() => {}}
            onViewDetails={() => navigate(`/deal/${nextDeal.id}`)}
            onVisitStore={() => {
              trackClick.mutate(nextDeal.id);
              window.open(
                nextDeal.affiliateUrl ?? nextDeal.productUrl,
                "_blank",
              );
            }}
          />
        </div>
      )}

      {/* --- PREV CARD (slides in from top during "prev" animation) --- */}
      {prevDeal && animating === "prev" && (
        <div
          className="absolute inset-0"
          style={{
            animation:
              "slideInFromTop 350ms cubic-bezier(0.32, 0.72, 0, 1) forwards",
          }}
        >
          <DealCard
            deal={prevDeal}
            isSaved={savedDeals.has(prevDeal.id)}
            onSave={() => {}}
            onVote={() => {}}
            onViewDetails={() => navigate(`/deal/${prevDeal.id}`)}
            onVisitStore={() => {
              trackClick.mutate(prevDeal.id);
              window.open(
                prevDeal.affiliateUrl ?? prevDeal.productUrl,
                "_blank",
              );
            }}
          />
        </div>
      )}

      {/* --- CURRENT CARD (exits during animation) --- */}
      <div
        className="absolute inset-0"
        style={{
          transform:
            animating === "next"
              ? "translateY(-100%)"
              : animating === "prev"
                ? "translateY(100%)"
                : `translate(${dragX}px, ${dragY}px)`,
          transition: animating
            ? "transform 350ms cubic-bezier(0.32, 0.72, 0, 1)"
            : isDragging
              ? "none"
              : "transform 0.15s ease-out",
        }}
      >
        <DealCard
          deal={currentDeal}
          isSaved={isSaved}
          onSave={handleSave}
          onVote={handleVote}
          onViewDetails={handleViewDetails}
          onVisitStore={handleVisitStore}
        />
      </div>

      {/* Keyframe injection */}
      <style>{`
        @keyframes slideInFromBottom {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes slideInFromTop {
          from { transform: translateY(-100%); }
          to   { transform: translateY(0); }
        }
      `}</style>

      {/* Navigation buttons (desktop) */}
      <div className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 flex-col gap-2 z-50">
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20"
          onClick={goToPrevious}
          disabled={currentIndex === 0}
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20 rotate-180"
          onClick={goToNext}
          disabled={currentIndex >= allDeals.length - 1}
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

export default Explore;
