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

export function Explore() {
  const navigate = useNavigate();
  const { region } = useFilterStore();
  const { isAuthenticated } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedDeals, setSavedDeals] = useState<Set<string>>(new Set());
  const [swipeDirection, setSwipeDirection] = useState<
    "up" | "down" | "right" | null
  >(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [touchDelta, setTouchDelta] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isLoading } = useDeals({
    sortBy: "popular",
    region,
  });

  const saveMutation = useSaveDeal();
  const voteMutation = useVoteDeal();
  const trackClick = useTrackClick();

  // Shuffle function using Fisher-Yates algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Shuffle deals on initial load
  const allDeals = useMemo(() => {
    const deals = data?.pages.flatMap((page) => page.data) || [];
    return shuffleArray(deals);
  }, [data?.pages]);

  const currentDeal = allDeals[currentIndex];

  // Prefetch next page when near end
  useEffect(() => {
    if (currentIndex >= allDeals.length - 3 && hasNextPage) {
      fetchNextPage();
    }
  }, [currentIndex, allDeals.length, hasNextPage, fetchNextPage]);

  const goToNext = useCallback(() => {
    if (currentIndex < allDeals.length - 1) {
      setSwipeDirection("up");
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setSwipeDirection(null);
      }, 200);
    }
  }, [currentIndex, allDeals.length]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setSwipeDirection("down");
      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1);
        setSwipeDirection(null);
      }, 200);
    }
  }, [currentIndex]);

  const handleSave = useCallback(() => {
    if (!currentDeal) return;
    if (!isAuthenticated) {
      toast.error("Please sign in to save deals");
      return;
    }

    const isSaved = savedDeals.has(currentDeal.id);
    setSwipeDirection("right");

    setTimeout(() => {
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
      setSwipeDirection(null);
    }, 200);
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
    if (currentDeal) {
      navigate(`/deal/${currentDeal.id}`);
    }
  }, [currentDeal, navigate]);

  const handleVisitStore = useCallback(() => {
    if (currentDeal) {
      trackClick.mutate(currentDeal.id);
      window.open(currentDeal.productUrl, "_blank");
    }
  }, [currentDeal, trackClick]);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setTouchDelta({ x: 0, y: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const deltaX = e.touches[0].clientX - touchStart.x;
    const deltaY = e.touches[0].clientY - touchStart.y;
    setTouchDelta({ x: deltaX, y: deltaY });
  };

  const handleTouchEnd = () => {
    if (!touchStart) return;

    const threshold = 80;

    if (Math.abs(touchDelta.y) > Math.abs(touchDelta.x)) {
      // Vertical swipe
      if (touchDelta.y < -threshold) {
        goToNext();
      } else if (touchDelta.y > threshold) {
        goToPrevious();
      }
    } else {
      // Horizontal swipe
      if (touchDelta.x > threshold) {
        handleSave();
      }
    }

    setTouchStart(null);
    setTouchDelta({ x: 0, y: 0 });
  };

  // Keyboard navigation
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
          <p className="text-muted-foreground mb-4">
            Check back later for new deals!
          </p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const isSaved = savedDeals.has(currentDeal.id);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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

      {/* Progress indicator */}
      <div className="absolute top-4 right-4 z-50 text-white/70 text-sm font-medium">
        {currentIndex + 1} / {allDeals.length}
      </div>

      {/* Deal Card */}
      <div
        className={cn(
          "absolute inset-0 transition-all duration-200",
          swipeDirection === "up" && "-translate-y-full opacity-0",
          swipeDirection === "down" && "translate-y-full opacity-0",
          swipeDirection === "right" && "translate-x-full opacity-0",
        )}
        style={{
          transform:
            touchDelta.y !== 0 || touchDelta.x !== 0
              ? `translate(${touchDelta.x * 0.3}px, ${touchDelta.y * 0.3}px)`
              : undefined,
        }}
      >
        {/* Background Image */}
        <div className="absolute inset-0">
          {currentDeal.imageUrl ? (
            <img
              src={currentDeal.imageUrl}
              alt={currentDeal.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/50 to-primary/70 flex items-center justify-center">
              <span className="text-9xl">
                {currentDeal.category?.icon || "🏷️"}
              </span>
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/50" />
        </div>

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-6 pb-24">
          {/* Category & Store */}
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-white/20 text-white border-0">
              {currentDeal.category?.icon} {currentDeal.category?.name}
            </Badge>
            <Badge variant="outline" className="text-white border-white/30">
              {currentDeal.store}
            </Badge>
          </div>

          {/* Title */}
          <h1
            className="text-2xl md:text-3xl font-bold text-white mb-4 line-clamp-3 cursor-pointer"
            onClick={handleViewDetails}
          >
            {currentDeal.title}
          </h1>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-4">
            {currentDeal.dealPrice && (
              <span className="text-3xl font-bold text-white">
                ₹{parseFloat(currentDeal.dealPrice).toLocaleString()}
              </span>
            )}
            {currentDeal.originalPrice && (
              <span className="text-xl text-white/50 line-through">
                ₹{parseFloat(currentDeal.originalPrice).toLocaleString()}
              </span>
            )}
            {currentDeal.discountPercent &&
              currentDeal.discountPercent >= 10 && (
                <Badge className="bg-red-500 text-white border-0 text-lg px-3">
                  {currentDeal.discountPercent}% OFF
                </Badge>
              )}
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 text-white/70 text-sm mb-6">
            <div className="flex items-center gap-1.5">
              <ThumbsUp className="h-4 w-4" />
              <span>{currentDeal.upvoteCount || 0} votes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{formatTimeAgo(currentDeal.createdAt)}</span>
            </div>
          </div>

          {/* CTA Button */}
          <Button
            size="lg"
            className="w-full rounded-full font-semibold gap-2 h-14 text-lg"
            onClick={handleVisitStore}
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
              isSaved &&
                "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
            onClick={handleSave}
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
            onClick={handleVote}
          >
            <ArrowUp className="h-6 w-6" />
          </Button>
        </div>

        {/* Swipe Hints */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-6 flex flex-col items-center text-white/50 text-xs">
          <ChevronUp className="h-4 w-4 animate-bounce" />
          <span>Swipe up for next</span>
        </div>
      </div>

      {/* Navigation buttons (desktop) */}
      <div className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 flex-col gap-2">
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
