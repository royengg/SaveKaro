import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Search,
  LogIn,
  Store,
  Bell,
  BadgeInfo,
  Heart,
  SlidersHorizontal,
} from "lucide-react";
import { useDeals, useCategories, useSavedDeals } from "@/hooks/useDeals";
import { useFilterStore } from "@/store/filterStore";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { dedupeDeals } from "@/lib/dealDeduping";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { Category, Deal } from "@/store/filterStore";
import { FeaturedDealsCarousel } from "@/components/home/FeaturedDealsCarousel";
import { AmazonDealsSplitCarousel } from "@/components/home/AmazonDealsSplitCarousel";
import { CouponDealsCarousel } from "@/components/home/CouponDealsCarousel";
import GuestEntryDialog from "@/components/home/GuestEntryDialog";
import SaveKaroMark from "@/components/brand/SaveKaroMark";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const SEARCH_DEBOUNCE_MS = 300;
const SCROLL_STOP_RESTORE_MS = 140;
const IDLE_TASK_TIMEOUT_MS = 500;
const DEFERRED_CATEGORY_MENU_MS = 1400;
const DEFERRED_MOBILE_FILTERS_MS = 1200;
const MOBILE_TOP_BAR_RESET_PX = 12;
const MOBILE_TOP_BAR_HIDE_THRESHOLD_PX = 28;
const MOBILE_TOP_BAR_SHOW_THRESHOLD_PX = 16;
const FilterDialog = lazy(() => import("@/components/filters/FilterDialog"));
const MobileFilters = lazy(() => import("@/components/filters/MobileFilters"));
const DealGrid = lazy(() => import("@/components/deals/DealGrid"));
const AuthUserMenu = lazy(() => import("@/components/home/AuthUserMenu"));
const CategoryMoreMenu = lazy(
  () => import("@/components/home/CategoryMoreMenu"),
);

function DealGridFallback() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div className="h-44 w-full rounded-2xl bg-secondary/60" />
          <div className="h-4 w-full rounded bg-secondary/70" />
          <div className="h-4 w-2/3 rounded bg-secondary/70" />
        </div>
      ))}
    </div>
  );
}

const DEFAULT_CATEGORY_TINT = "#64748b";
const GUEST_ENTRY_SESSION_KEY = "savekaro_guest_entry_dismissed";
const RECOMMENDATION_STOP_WORDS = new Set([
  "the",
  "and",
  "with",
  "from",
  "this",
  "that",
  "your",
  "for",
  "you",
  "deal",
  "deals",
  "offer",
  "offers",
  "sale",
  "today",
  "latest",
  "price",
  "best",
  "off",
  "flat",
  "upto",
  "only",
  "free",
  "check",
  "current",
  "store",
  "shop",
  "buy",
  "coupon",
  "promo",
  "code",
]);

type IdleCapableWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const runWhenIdle = (callback: () => void, timeout = IDLE_TASK_TIMEOUT_MS) => {
  const idleWindow = window as IdleCapableWindow;

  if (typeof idleWindow.requestIdleCallback === "function") {
    const idleId = idleWindow.requestIdleCallback(() => callback(), {
      timeout,
    });
    return () => {
      if (typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleId);
      }
    };
  }

  const timeoutId = window.setTimeout(callback, timeout);
  return () => window.clearTimeout(timeoutId);
};

function normalizeHexColor(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_CATEGORY_TINT;
  }

  const trimmed = value.trim();
  const shortHex = /^#([0-9a-f]{3})$/i;
  const longHex = /^#([0-9a-f]{6})$/i;

  if (longHex.test(trimmed)) {
    return trimmed;
  }

  const shortMatch = trimmed.match(shortHex);
  if (!shortMatch) {
    return DEFAULT_CATEGORY_TINT;
  }

  const [r, g, b] = shortMatch[1].split("");
  return `#${r}${r}${g}${g}${b}${b}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = normalizeHexColor(hex);
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
}

function getCategoryPillStyle(color: string | null | undefined, active: boolean): CSSProperties {
  const [r, g, b] = hexToRgb(color ?? DEFAULT_CATEGORY_TINT);
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${active ? 0.18 : 0.08})`,
    borderColor: `rgba(${r}, ${g}, ${b}, ${active ? 0.5 : 0.22})`,
    boxShadow: active
      ? `0 12px 20px -18px rgba(${r}, ${g}, ${b}, 0.95)`
      : "0 0 0 rgba(0,0,0,0)",
  };
}

function getCategoryIconStyle(color: string | null | undefined, active: boolean): CSSProperties {
  const [r, g, b] = hexToRgb(color ?? DEFAULT_CATEGORY_TINT);
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${active ? 0.26 : 0.14})`,
  };
}

function normalizePreferenceValue(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function tokenizeRecommendationText(...values: Array<string | null | undefined>): string[] {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  const tokens = text
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(
      (token) =>
        token.length >= 3 &&
        !RECOMMENDATION_STOP_WORDS.has(token),
    );

  return Array.from(new Set(tokens));
}

function PicksIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 2.4V4.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8 11.9V13.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2.4 8H4.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11.9 8H13.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M4.3 4.3L5.5 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10.5 10.5L11.7 11.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M4.3 11.7L5.5 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10.5 5.5L11.7 4.3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="8" r="1.35" fill="currentColor" />
    </svg>
  );
}

function TrendIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.2 11.8H13.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M3.1 8.1L5.9 6.5L8.2 7.4L12.1 4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.4 4.5H12.1V6.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DropsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path d="M4.2 11.8L11.8 4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="5" cy="5" r="1.5" fill="currentColor" />
      <circle cx="11" cy="11" r="1.5" fill="currentColor" />
    </svg>
  );
}
export function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    category,
    store,
    minDiscount,
    search,
    sortBy,
    region,
    toggleRegion,
    setSearch,
    setCategory,
    setSortBy,
    setMinDiscount,
    resetFilters,
  } = useFilterStore();
  const {
    isHomeTopBarHidden,
    setHomeTopBarHidden,
    setHomeChromeScrolling,
  } = useUiStore();
  const {
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
    logout,
  } = useAuthStore();
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(search);
  const [hasChosenGuestMode, setHasChosenGuestMode] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.sessionStorage.getItem(GUEST_ENTRY_SESSION_KEY) === "1";
  });
  const [isGuestEntryOpen, setIsGuestEntryOpen] = useState(false);
  const [shouldLoadCategories, setShouldLoadCategories] = useState(false);
  const [shouldLoadCategoryMoreMenu, setShouldLoadCategoryMoreMenu] = useState(false);
  const [shouldLoadMobileFilters, setShouldLoadMobileFilters] = useState(false);
  const [isFeedReady, setIsFeedReady] = useState(false);
  const [activeDiscoveryPreset, setActiveDiscoveryPreset] = useState<"liked" | null>(
    null,
  );
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia("(max-width: 767px)").matches;
  });
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { data: categories } = useCategories({ enabled: shouldLoadCategories });
  const { data: savedDeals = [] } = useSavedDeals({ enabled: isAuthenticated });

  // Keep local input state aligned when search is reset externally (nav/pig/home buttons).
  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  useEffect(() => runWhenIdle(() => setShouldLoadCategories(true), 700), []);
  useEffect(() => runWhenIdle(() => setIsFeedReady(true), 250), []);
  useEffect(
    () => runWhenIdle(() => setShouldLoadCategoryMoreMenu(true), DEFERRED_CATEGORY_MENU_MS),
    [],
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };

    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (isAuthenticated || hasChosenGuestMode) {
      setIsGuestEntryOpen(false);
      return;
    }

    setIsGuestEntryOpen(true);
  }, [hasChosenGuestMode, isAuthenticated, isAuthLoading]);

  useEffect(() => {
    if (!isMobileViewport) {
      setShouldLoadMobileFilters(false);
      return;
    }

    return runWhenIdle(
      () => setShouldLoadMobileFilters(true),
      DEFERRED_MOBILE_FILTERS_MS,
    );
  }, [isMobileViewport]);

  // Read category from URL params on mount
  useEffect(() => {
    const urlCategory = searchParams.get("category");
    if (urlCategory && urlCategory !== category) {
      setCategory(urlCategory);
      // Clear the URL param after setting
      searchParams.delete("category");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, setCategory, category]);

  // Mobile chrome behavior:
  // - hide the sticky top bar only when the user scrolls deeper into the feed
  // - reveal it when they reverse direction and scroll upward
  // - soften bottom-edge chrome only while active scrolling is in progress
  useEffect(() => {
    if (!isMobileViewport) {
      setHomeTopBarHidden(false);
      setHomeChromeScrolling(false);
      return;
    }

    let isTopBarHidden = false;
    let isScrolling = false;
    let lastScrollY = Math.max(window.scrollY, 0);
    let lastDirection: "up" | "down" | null = null;
    let directionalDistance = 0;
    let stopTimer: number | null = null;

    const setTopBarHidden = (next: boolean) => {
      if (isTopBarHidden === next) {
        return;
      }
      isTopBarHidden = next;
      setHomeTopBarHidden(next);
    };

    const setScrolling = (next: boolean) => {
      if (isScrolling === next) {
        return;
      }
      isScrolling = next;
      setHomeChromeScrolling(next);
    };

    const handleScroll = () => {
      const currentScrollY = Math.max(window.scrollY, 0);
      const delta = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;

      if (currentScrollY <= MOBILE_TOP_BAR_RESET_PX) {
        if (stopTimer !== null) {
          window.clearTimeout(stopTimer);
          stopTimer = null;
        }
        directionalDistance = 0;
        lastDirection = null;
        setTopBarHidden(false);
        setScrolling(false);
        return;
      }

      if (Math.abs(delta) < 2) {
        return;
      }

      const direction = delta > 0 ? "down" : "up";
      if (direction !== lastDirection) {
        directionalDistance = 0;
        lastDirection = direction;
      }
      directionalDistance += Math.abs(delta);

      setScrolling(true);

      if (stopTimer !== null) {
        window.clearTimeout(stopTimer);
      }

      stopTimer = window.setTimeout(() => {
        setScrolling(false);
      }, SCROLL_STOP_RESTORE_MS);

      if (
        direction === "down" &&
        directionalDistance >= MOBILE_TOP_BAR_HIDE_THRESHOLD_PX
      ) {
        setTopBarHidden(true);
        directionalDistance = 0;
        return;
      }

      if (
        direction === "up" &&
        directionalDistance >= MOBILE_TOP_BAR_SHOW_THRESHOLD_PX
      ) {
        setTopBarHidden(false);
        directionalDistance = 0;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (stopTimer !== null) {
        window.clearTimeout(stopTimer);
      }
      setHomeTopBarHidden(false);
      setHomeChromeScrolling(false);
    };
  }, [isMobileViewport, setHomeChromeScrolling, setHomeTopBarHidden]);

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useDeals({
    category,
    store,
    minDiscount,
    search,
    sortBy,
    region,
    retainAllPages: true,
  });
  const hasNextPageRef = useRef(Boolean(hasNextPage));
  const isFetchingNextPageRef = useRef(isFetchingNextPage);
  const loadMoreTriggeredRef = useRef(false);

  useEffect(() => {
    hasNextPageRef.current = Boolean(hasNextPage);
  }, [hasNextPage]);

  useEffect(() => {
    isFetchingNextPageRef.current = isFetchingNextPage;
  }, [isFetchingNextPage]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }

        if (!entry.isIntersecting) {
          loadMoreTriggeredRef.current = false;
          return;
        }

        if (
          loadMoreTriggeredRef.current ||
          isFetchingNextPageRef.current ||
          !hasNextPageRef.current
        ) {
          return;
        }

        loadMoreTriggeredRef.current = true;
        fetchNextPage();
      },
      {
        rootMargin: "200px 0px",
        threshold: 0,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage]);

  // Flatten paginated data
  const deals = useMemo(() => {
    return dedupeDeals(data?.pages.flatMap((page) => page.data) ?? []);
  }, [data]);

  const savedDealIds = useMemo(() => {
    return new Set(savedDeals.map((deal) => deal.id));
  }, [savedDeals]);

  const likedSeedDeals = useMemo(() => {
    const seeds = new Map<string, Deal>();

    savedDeals.forEach((deal) => {
      if (deal.region === region) {
        seeds.set(deal.id, deal);
      }
    });

    deals.forEach((deal) => {
      if (
        deal.region === region &&
        (deal.userSaved || deal.userUpvote === 1 || savedDealIds.has(deal.id))
      ) {
        seeds.set(deal.id, deal);
      }
    });

    return Array.from(seeds.values());
  }, [savedDeals, deals, region, savedDealIds]);

  const recommendationSignals = useMemo(() => {
    const categoryWeights = new Map<string, number>();
    const storeWeights = new Map<string, number>();
    const brandWeights = new Map<string, number>();
    const titleTokenWeights = new Map<string, number>();

    likedSeedDeals.forEach((deal) => {
      const signalWeight = savedDealIds.has(deal.id) || deal.userSaved ? 2.2 : 1.5;
      const categoryKey = deal.category?.slug;
      const storeKey = normalizePreferenceValue(deal.store);
      const brandKey = normalizePreferenceValue(deal.brand);

      if (categoryKey) {
        categoryWeights.set(
          categoryKey,
          (categoryWeights.get(categoryKey) ?? 0) + signalWeight,
        );
      }

      if (storeKey) {
        storeWeights.set(storeKey, (storeWeights.get(storeKey) ?? 0) + signalWeight);
      }

      if (brandKey) {
        brandWeights.set(brandKey, (brandWeights.get(brandKey) ?? 0) + signalWeight);
      }

      tokenizeRecommendationText(
        deal.cleanTitle,
        deal.title,
        deal.brand,
        deal.store,
      ).forEach((token) => {
        titleTokenWeights.set(
          token,
          (titleTokenWeights.get(token) ?? 0) + signalWeight,
        );
      });
    });

    return {
      categoryWeights,
      storeWeights,
      brandWeights,
      titleTokenWeights,
    };
  }, [likedSeedDeals, savedDealIds]);

  const hasLikedSignals = isAuthenticated && likedSeedDeals.length > 0;

  const displayDeals = useMemo(() => {
    if (activeDiscoveryPreset !== "liked" || !hasLikedSignals) {
      return deals;
    }

    const likedDealIds = new Set(likedSeedDeals.map((deal) => deal.id));

    const scoredDeals = deals.map((deal, index) => {
      if (likedDealIds.has(deal.id)) {
        return { deal, index, score: -1 };
      }

      let score = 0;
      const categoryKey = deal.category?.slug;
      const storeKey = normalizePreferenceValue(deal.store);
      const brandKey = normalizePreferenceValue(deal.brand);

      if (categoryKey) {
        score +=
          (recommendationSignals.categoryWeights.get(categoryKey) ?? 0) * 8;
      }

      if (storeKey) {
        score += (recommendationSignals.storeWeights.get(storeKey) ?? 0) * 10;
      }

      if (brandKey) {
        score += (recommendationSignals.brandWeights.get(brandKey) ?? 0) * 7;
      }

      const titleTokenScore = tokenizeRecommendationText(
        deal.cleanTitle,
        deal.title,
        deal.brand,
      ).reduce((total, token) => {
        return total + (recommendationSignals.titleTokenWeights.get(token) ?? 0);
      }, 0);

      score += Math.min(titleTokenScore * 1.45, 18);
      score += Math.min((deal.discountPercent ?? 0) / 12, 6);
      score += deal.imageUrl ? 0.75 : 0;

      const ageInHours =
        (Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60);
      score += Math.max(0, 3 - ageInHours / 24);

      return { deal, index, score };
    });

    const recommended = scoredDeals
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.index - b.index;
      })
      .map(({ deal }) => deal);

    const remaining = scoredDeals
      .filter(({ score }) => score <= 0)
      .sort((a, b) => a.index - b.index)
      .map(({ deal }) => deal);

    return recommended.concat(remaining);
  }, [activeDiscoveryPreset, deals, hasLikedSignals, likedSeedDeals, recommendationSignals]);

  useEffect(() => {
    if (activeDiscoveryPreset === "liked" && !hasLikedSignals) {
      setActiveDiscoveryPreset(null);
    }
  }, [activeDiscoveryPreset, hasLikedSignals]);

  useEffect(() => {
    const normalizedInput = searchValue.trim();
    const normalizedActiveSearch = search.trim();

    if (normalizedInput === normalizedActiveSearch) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSearch(normalizedInput);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchValue, search, setSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchValue.trim());

    // On mobile browsers (notably iOS Safari), blur active input after submit
    // to avoid lingering keyboard/zoom state.
    if (window.matchMedia("(max-width: 767px)").matches) {
      const active = document.activeElement;
      if (active instanceof HTMLElement) {
        active.blur();
      }
    }
  };

  const handleSearchInputChange = (value: string) => {
    setSearchValue(value);

    // If an active search is cleared, reset immediately without requiring Enter.
    if (value.trim() === "" && search.trim() !== "") {
      setSearch("");
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const resetToHomeDefault = () => {
    setActiveDiscoveryPreset(null);
    setSearchValue("");
    resetFilters();
    setSearchParams({}, { replace: true });
  };

  const categoriesList: Category[] = categories ?? [];
  const isBecauseYouLikedThis = activeDiscoveryPreset === "liked";
  const isTodayPicks = !isBecauseYouLikedThis && sortBy === "newest" && !minDiscount;
  const isTrendingStores = !isBecauseYouLikedThis && sortBy === "popular";
  const isBigDrops =
    !isBecauseYouLikedThis &&
    !isTrendingStores &&
    (sortBy === "discount" || (minDiscount ?? 0) >= 50);

  const applyDiscoveryPreset = (preset: "today" | "trending" | "drops" | "liked") => {
    if (preset === "liked") {
      if (!hasLikedSignals) {
        return;
      }

      setActiveDiscoveryPreset("liked");
      setSortBy("newest");
      setMinDiscount(null);
      return;
    }

    setActiveDiscoveryPreset(null);

    if (preset === "today") {
      setSortBy("newest");
      setMinDiscount(null);
      return;
    }
    if (preset === "trending") {
      setSortBy("popular");
      setMinDiscount(null);
      return;
    }
    setSortBy("discount");
    setMinDiscount(50);
  };

  const triggerCategoryMoreMenuLoad = () => {
    if (!shouldLoadCategoryMoreMenu) {
      setShouldLoadCategoryMoreMenu(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <GuestEntryDialog
        open={isGuestEntryOpen}
        onBrowseGuest={() => {
          window.sessionStorage.setItem(GUEST_ENTRY_SESSION_KEY, "1");
          setHasChosenGuestMode(true);
          setIsGuestEntryOpen(false);
        }}
        onLogin={handleGoogleLogin}
      />

      {/* Filter Dialog */}
      {filterOpen ? (
        <Suspense fallback={null}>
          <FilterDialog open={filterOpen} onOpenChange={setFilterOpen} />
        </Suspense>
      ) : null}

      {/* Main Content */}
      <div>
        {/* Minimal Top Bar */}
        <header
          className={cn(
            "motion-home-topbar sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:translate-y-0 md:opacity-100 md:pointer-events-auto md:transition-none",
            isHomeTopBarHidden
              ? "pointer-events-none -translate-y-[calc(100%+0.5rem)] opacity-0 shadow-none"
              : "translate-y-0 opacity-100 shadow-[0_1px_0_rgba(15,23,42,0.04)]",
          )}
        >
          <div className="flex h-[3.2rem] items-center justify-between px-3 md:h-20 md:px-8">
            {/* Mobile Logo */}
            <Link
              to="/"
              className="flex items-center gap-1.5 md:hidden"
              onClick={resetToHomeDefault}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center">
                <SaveKaroMark className="h-[1.375rem] w-[1.375rem] drop-shadow-sm" />
              </span>
              <span className="text-[15px] font-bold">SaveKaro</span>
            </Link>

            {/* Search Bar */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 max-w-3xl mx-auto"
            >
              <div className="relative w-full">
                <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search deals..."
                  className="pl-14 pr-5 h-14 text-lg rounded-full bg-secondary border-0 focus-visible:ring-2"
                  value={searchValue}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                />
              </div>
            </form>

            {/* User Actions */}
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFilterOpen(true)}
                title="Platform"
                aria-label="Platform"
                className="h-8 w-8 p-0 sm:h-10 sm:w-10"
              >
                <span className="flex h-full w-full items-center justify-center">
                  <Store className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
                </span>
              </Button>

              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 sm:h-10 sm:w-10"
              >
                <Link
                  to="/affiliate-disclosure"
                  title="Affiliate Disclosure"
                  aria-label="Open affiliate disclosure page"
                >
                  <span className="flex h-full w-full items-center justify-center">
                    <BadgeInfo className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
                  </span>
                </Link>
              </Button>

              {/* Notifications */}
              {isAuthenticated && (
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="group/bell h-8 w-8 p-0 sm:h-10 sm:w-10"
                >
                  <Link
                    to="/notifications"
                    title="Notifications"
                    aria-label="Open notifications page"
                  >
                    <span className="flex h-full w-full items-center justify-center">
                      <Bell className="motion-bell-jingle h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
                    </span>
                  </Link>
                </Button>
              )}

              {/* Region Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleRegion}
                title={
                  region === "INDIA"
                    ? "Showing India deals. Click for World"
                    : "Showing World deals. Click for India"
                }
                aria-label={
                  region === "INDIA" ? "Switch to world deals" : "Switch to India deals"
                }
                className="h-8 w-8 p-0 sm:h-10 sm:w-10"
              >
                <span className="flex h-full w-full items-center justify-center">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-[16px] leading-none sm:h-6 sm:w-6 sm:text-[18px]">
                    {region === "INDIA" ? "🇮🇳" : "🌍"}
                  </span>
                </span>
              </Button>
              {isAuthenticated ? (
                <Suspense
                  fallback={
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full p-0 sm:h-10 sm:w-10"
                    >
                      <div className="h-8 w-8 rounded-full bg-secondary sm:h-10 sm:w-10" />
                    </Button>
                  }
                >
                  <AuthUserMenu user={user} onLogout={logout} />
                </Suspense>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleGoogleLogin}
                  title="Sign in with Google"
                  aria-label="Sign in with Google"
                  className="h-8 w-8 p-0 sm:h-10 sm:w-10"
                >
                  <span className="flex h-full w-full items-center justify-center">
                    <LogIn className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
                  </span>
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="px-3 pb-1.5 md:hidden">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search deals..."
                className="h-[2.15rem] w-full rounded-full border-0 bg-secondary pl-8 text-base"
                value={searchValue}
                onChange={(e) => handleSearchInputChange(e.target.value)}
              />
            </form>
          </div>

          {/* Discovery Strip */}
          <div className="border-t border-border/60 bg-gradient-to-r from-amber-50/45 via-background to-rose-50/40 px-3 py-1.5 md:px-8 md:py-2">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <span
                className="motion-discover-label shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90 md:text-[11px]"
                style={{ animationDelay: "20ms" }}
              >
                Discover
              </span>

              <button
                onClick={() => applyDiscoveryPreset("today")}
                className={cn(
                  "motion-pill-enter shrink-0 inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-[transform,box-shadow,background-color,border-color,color] duration-200 will-change-transform hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] md:min-h-9 md:py-1.5 md:text-xs",
                  isTodayPicks
                    ? "motion-pill-active bg-amber-200/30 border-amber-300/60 text-foreground shadow-[0_14px_22px_-20px_rgba(245,158,11,0.85)]"
                    : "bg-background/70 border-border text-muted-foreground hover:border-border/80 hover:bg-background/90 hover:text-foreground",
                )}
                style={{ animationDelay: "70ms" }}
                aria-label="Show today's picks"
                title="Today's picks"
              >
                <PicksIcon className="h-3.5 w-3.5" />
                Today's picks
              </button>

              <button
                onClick={() => applyDiscoveryPreset("trending")}
                className={cn(
                  "motion-pill-enter shrink-0 inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-[transform,box-shadow,background-color,border-color,color] duration-200 will-change-transform hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] md:min-h-9 md:py-1.5 md:text-xs",
                  isTrendingStores
                    ? "motion-pill-active bg-sky-200/30 border-sky-300/60 text-foreground shadow-[0_14px_22px_-20px_rgba(14,165,233,0.78)]"
                    : "bg-background/70 border-border text-muted-foreground hover:border-border/80 hover:bg-background/90 hover:text-foreground",
                )}
                style={{ animationDelay: "120ms" }}
                aria-label="Show trending stores deals"
                title="Trending stores"
              >
                <TrendIcon className="h-3.5 w-3.5" />
                Trending stores
              </button>

              <button
                onClick={() => applyDiscoveryPreset("drops")}
                className={cn(
                  "motion-pill-enter shrink-0 inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-[transform,box-shadow,background-color,border-color,color] duration-200 will-change-transform hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] md:min-h-9 md:py-1.5 md:text-xs",
                  isBigDrops
                    ? "motion-pill-active bg-emerald-200/35 border-emerald-300/60 text-foreground shadow-[0_14px_22px_-20px_rgba(16,185,129,0.8)]"
                    : "bg-background/70 border-border text-muted-foreground hover:border-border/80 hover:bg-background/90 hover:text-foreground",
                )}
                style={{ animationDelay: "170ms" }}
                aria-label="Show big drops"
                title="Big drops"
              >
                <DropsIcon className="h-3.5 w-3.5" />
                Big drops
              </button>

              <button
                onClick={() => applyDiscoveryPreset("liked")}
                disabled={!hasLikedSignals}
                className={cn(
                  "motion-pill-enter shrink-0 inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-[transform,box-shadow,background-color,border-color,color] duration-200 will-change-transform hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] md:min-h-9 md:py-1.5 md:text-xs",
                  isBecauseYouLikedThis
                    ? "motion-pill-active bg-rose-200/35 border-rose-300/70 text-foreground shadow-[0_14px_22px_-20px_rgba(244,114,182,0.82)]"
                    : "bg-background/70 border-border text-muted-foreground hover:border-border/80 hover:bg-background/90 hover:text-foreground",
                  !hasLikedSignals && "cursor-not-allowed opacity-60 hover:text-muted-foreground",
                )}
                style={{ animationDelay: "220ms" }}
                aria-label="Show recommendations based on deals you liked"
                title={
                  hasLikedSignals
                    ? "Because you liked this"
                    : "Save or upvote deals to unlock recommendations"
                }
              >
                <Heart className="h-3.5 w-3.5" />
                Because you liked this
              </button>
            </div>
          </div>

          {/* Category Navigation Bar */}
          <div className="border-b border-border/60 bg-gradient-to-r from-background via-secondary/35 to-background px-3 py-1 md:px-8 md:py-3">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setCategory(null)}
                className={`shrink-0 inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium whitespace-nowrap transition-colors duration-200 ease-out md:min-h-9 md:px-3.5 md:py-1.5 md:text-sm ${
                  category === null
                    ? "text-foreground border-slate-400/40 bg-slate-400/15"
                    : "text-muted-foreground border-slate-300/40 bg-slate-300/10 hover:text-foreground"
                }`}
              >
                All
              </button>
              {categories?.slice(0, 6).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.slug)}
                  className={`hidden md:inline-flex shrink-0 min-h-9 items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-colors duration-200 ease-out ${
                    category === cat.slug
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={getCategoryPillStyle(cat.color, category === cat.slug)}
                >
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] leading-none"
                    style={getCategoryIconStyle(cat.color, category === cat.slug)}
                  >
                    {getCategoryIcon(cat)}
                  </span>
                  {cat.name}
                </button>
              ))}

              {/* More Categories Menu */}
              {shouldLoadCategoryMoreMenu ? (
                <Suspense
                  fallback={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 rounded-full px-3 text-[13px] md:h-9 md:text-sm"
                    >
                      <span className="hidden sm:inline">More</span>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M4 12h16M4 18h16"
                        />
                      </svg>
                    </Button>
                  }
                >
                  <CategoryMoreMenu
                    categories={categoriesList}
                    selectedCategory={category}
                    onSelectCategory={setCategory}
                    />
                </Suspense>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 rounded-full px-3 text-[13px] md:h-9 md:text-sm"
                  onClick={triggerCategoryMoreMenuLoad}
                  onMouseEnter={triggerCategoryMoreMenuLoad}
                  onFocus={triggerCategoryMoreMenuLoad}
                  onTouchStart={triggerCategoryMoreMenuLoad}
                  aria-label="Load more categories"
                  title="More categories"
                >
                  <span className="hidden sm:inline">More</span>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </Button>
              )}

              {isMobileViewport ? (
                shouldLoadMobileFilters ? (
                  <Suspense
                    fallback={
                      <Button
                        variant="ghost"
                        size="sm"
                      className="h-8 w-8 shrink-0 rounded-full border border-slate-300/40 bg-slate-300/10 p-0 text-muted-foreground"
                      aria-label="Load filters"
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="sr-only">Filters</span>
                      </Button>
                    }
                  >
                    <MobileFilters compact />
                  </Suspense>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 shrink-0 rounded-full border border-slate-300/40 bg-slate-300/10 p-0 text-muted-foreground"
                    onClick={() => setShouldLoadMobileFilters(true)}
                    onMouseEnter={() => setShouldLoadMobileFilters(true)}
                    onFocus={() => setShouldLoadMobileFilters(true)}
                    onTouchStart={() => setShouldLoadMobileFilters(true)}
                    aria-label="Load filters"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="sr-only">Filters</span>
                  </Button>
                )
              ) : null}
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <main className="px-4 md:px-6 py-4 pb-24 md:pb-8">
          {/* Error State */}
          {isError && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-7xl mb-6">😕</div>
              <h3 className="text-2xl font-semibold mb-3">
                Something went wrong
              </h3>
              <p className="text-muted-foreground mb-6">
                {error instanceof Error
                  ? error.message
                  : "Failed to load deals"}
              </p>
              <Button onClick={() => refetch()} className="rounded-full">
                Try Again
              </Button>
            </div>
          )}

          {/* Deal Grid */}
          {!isError && (
            <>
              <AmazonDealsSplitCarousel region={region} />
              <FeaturedDealsCarousel
                deals={deals}
                isLoading={isLoading}
                isImagePriorityPrimary={false}
              />
              <CouponDealsCarousel deals={deals} isLoading={isLoading} />

              {isFeedReady ? (
                <Suspense fallback={<DealGridFallback />}>
                  <DealGrid
                    deals={displayDeals}
                    isLoading={isLoading}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                  />
                </Suspense>
              ) : (
                <DealGridFallback />
              )}

              {/* Load More Trigger */}
              {hasNextPage && (
                <div ref={loadMoreRef} className="flex justify-center py-8">
                  {isFetchingNextPage && (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  )}
                </div>
              )}

              {/* End of Results */}
              {!hasNextPage && deals.length > 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  You've seen all the deals! 🎉
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Home;
