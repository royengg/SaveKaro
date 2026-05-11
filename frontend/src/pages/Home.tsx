import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import {
  useDeals,
  useCategories,
  useHomeBootstrap,
  useHomeUserSummary,
} from "@/hooks/useDeals";
import { useFilterStore } from "@/store/filterStore";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { dedupeDeals } from "@/lib/dealDeduping";
import { getNextRegion, getRegionMeta } from "@/lib/regions";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Category, Deal } from "@/store/filterStore";
import { FeaturedDealsCarousel } from "@/components/home/FeaturedDealsCarousel";
import { AmazonDealsSplitCarousel } from "@/components/home/AmazonDealsSplitCarousel";
import { CouponDealsCarousel } from "@/components/home/CouponDealsCarousel";
import HomeWalkthroughInline from "@/components/home/HomeWalkthroughInline";
import MyntraHeroCarousel from "@/components/home/MyntraHeroCarousel";
import GuestEntryDialog from "@/components/home/GuestEntryDialog";
import { HomeTopBar } from "@/components/home/HomeTopBar";
import { cancelAnimations, playSearchCricketAnimation } from "@/components/home/SearchCricketIcons";
import {
  API_URL,
  SEARCH_DEBOUNCE_MS,
  SCROLL_STOP_RESTORE_MS,
  DEFERRED_CATEGORY_MENU_MS,
  DEFERRED_MOBILE_FILTERS_MS,
  MOBILE_TOP_BAR_RESET_PX,
  MOBILE_TOP_BAR_HIDE_THRESHOLD_PX,
  MOBILE_TOP_BAR_SHOW_THRESHOLD_PX,
  SEARCH_CRICKET_LOOP_MS,
  SEARCH_CRICKET_PASS_MS,
  SEARCH_PROMPT_CYCLE_MS,
  SEARCH_PROMPTS,
  GUEST_ENTRY_SESSION_KEY,
  runWhenIdle,
  normalizePreferenceValue,
  tokenizeRecommendationText,
} from "@/lib/homeUtils";
import { usePageMeta } from "@/hooks/usePageMeta";

const FilterDialog = lazy(() => import("@/components/filters/FilterDialog"));
const DealGrid = lazy(() => import("@/components/deals/DealGrid"));

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

type RecommendationSeed = {
  id: string;
  title: string;
  cleanTitle?: string | null;
  brand?: string | null;
  store?: string | null;
  region: Deal["region"];
  category?: {
    slug: string;
  } | null;
  userSaved?: boolean;
  userUpvote?: number | null;
};

export function Home() {
  usePageMeta({
    title: "SaveKaro — Best Deals, Discounts & Offers in India",
    description:
      "Find the hottest deals, discounts, and offers in India across Amazon, Myntra, electronics, fashion, gaming, and more on SaveKaro.",
    canonicalPath: "/",
  });

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
    setDiscoveryPreset,
    resetFilters,
  } = useFilterStore();
  const { isHomeTopBarHidden, setHomeTopBarHidden, setHomeChromeScrolling } =
    useUiStore();
  const {
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
    logout,
  } = useAuthStore();
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(search);
  const [searchPromptIndex, setSearchPromptIndex] = useState(0);
  const [shouldAnimateSearchCricket, setShouldAnimateSearchCricket] =
    useState<boolean>(() => {
      if (
        typeof window === "undefined" ||
        typeof window.matchMedia !== "function"
      ) {
        return true;
      }

      return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    });
  const [hasChosenGuestMode, setHasChosenGuestMode] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.sessionStorage.getItem(GUEST_ENTRY_SESSION_KEY) === "1";
  });
  const [isGuestEntryOpen, setIsGuestEntryOpen] = useState(false);
  const [shouldLoadCategories, setShouldLoadCategories] = useState(false);
  const [shouldLoadCategoryMoreMenu, setShouldLoadCategoryMoreMenu] =
    useState(false);
  const [shouldLoadMobileFilters, setShouldLoadMobileFilters] = useState(false);
  const [isFeedReady, setIsFeedReady] = useState(false);
  const [activeDiscoveryPreset, setActiveDiscoveryPreset] = useState<
    "liked" | null
  >(null);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return false;
    }
    return window.matchMedia("(max-width: 767px)").matches;
  });
  const desktopSearchBallRef = useRef<HTMLSpanElement | null>(null);
  const desktopSearchWicketRef = useRef<HTMLSpanElement | null>(null);
  const mobileSearchBallRef = useRef<HTMLSpanElement | null>(null);
  const mobileSearchWicketRef = useRef<HTMLSpanElement | null>(null);
  const searchHasTextRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { data: categories } = useCategories({ enabled: shouldLoadCategories });
  const {
    data: homePublicBootstrap,
    isLoading: isHomeBootstrapLoading,
    refetch: refetchHomeBootstrap,
  } = useHomeBootstrap({
    category,
    store,
    minDiscount,
    search,
    sortBy,
    region,
  });
  const { data: homeUserSummary } = useHomeUserSummary({
    enabled: isAuthenticated,
    userId: user?.id ?? null,
  });
  const unreadNotificationCount =
    homeUserSummary?.unreadNotificationCount ?? 0;
  const savedSignals = homeUserSummary?.savedSignals ?? [];
  const shouldHoldDealsQueryForBootstrap =
    isHomeBootstrapLoading && !homePublicBootstrap;
  const homeBootstrapFeedInitialData = homePublicBootstrap
    ? {
        pages: [homePublicBootstrap.feed],
        pageParams: [1],
      }
    : undefined;

  // Keep local input state aligned when search is reset externally (nav/pig/home buttons).
  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  useEffect(() => runWhenIdle(() => setShouldLoadCategories(true), 700), []);
  useEffect(() => runWhenIdle(() => setIsFeedReady(true), 250), []);
  useEffect(
    () =>
      runWhenIdle(
        () => setShouldLoadCategoryMoreMenu(true),
        DEFERRED_CATEGORY_MENU_MS,
      ),
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
    if (typeof window === "undefined" || searchValue.trim().length > 0) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setSearchPromptIndex((current) => (current + 1) % SEARCH_PROMPTS.length);
    }, SEARCH_PROMPT_CYCLE_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [searchValue, searchPromptIndex]);

  useEffect(() => {
    searchHasTextRef.current = searchValue.trim().length > 0;
  }, [searchValue]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = (event?: MediaQueryListEvent | MediaQueryList) => {
      setShouldAnimateSearchCricket(!(event?.matches ?? mediaQuery.matches));
    };

    updatePreference(mediaQuery);
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      region !== "INDIA" ||
      !shouldAnimateSearchCricket
    ) {
      return;
    }

    const playAnimation = () => {
      const shouldAnimateWicket = !searchHasTextRef.current;
      playSearchCricketAnimation(
        desktopSearchBallRef.current,
        shouldAnimateWicket ? desktopSearchWicketRef.current : null,
        SEARCH_CRICKET_PASS_MS,
      );
      playSearchCricketAnimation(
        mobileSearchBallRef.current,
        shouldAnimateWicket ? mobileSearchWicketRef.current : null,
        SEARCH_CRICKET_PASS_MS,
      );
    };

    playAnimation();
    const intervalId = window.setInterval(
      playAnimation,
      SEARCH_CRICKET_LOOP_MS,
    );

    return () => {
      window.clearInterval(intervalId);
      cancelAnimations(desktopSearchBallRef.current);
      cancelAnimations(desktopSearchWicketRef.current);
      cancelAnimations(mobileSearchBallRef.current);
      cancelAnimations(mobileSearchWicketRef.current);
    };
  }, [region, shouldAnimateSearchCricket]);

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
    isLoading: isDealsLoading,
    isError: isDealsError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchDeals,
  } = useDeals({
    category,
    store,
    minDiscount,
    search,
    sortBy,
    region,
    retainAllPages: true,
    enabled: !shouldHoldDealsQueryForBootstrap,
    initialData: homeBootstrapFeedInitialData,
  });
  const isLoading = shouldHoldDealsQueryForBootstrap || isDealsLoading;
  const isError = isDealsError;
  const refetch = async () => {
    await Promise.all([refetchHomeBootstrap(), refetchDeals()]);
  };
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
    return new Set(savedSignals.map((deal) => deal.id));
  }, [savedSignals]);

  const likedSeedDeals = useMemo(() => {
    const seeds = new Map<string, RecommendationSeed>();

    savedSignals.forEach((deal) => {
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
  }, [savedSignals, deals, region, savedDealIds]);

  const recommendationSignals = useMemo(() => {
    const categoryWeights = new Map<string, number>();
    const storeWeights = new Map<string, number>();
    const brandWeights = new Map<string, number>();
    const titleTokenWeights = new Map<string, number>();

    likedSeedDeals.forEach((deal) => {
      const signalWeight =
        savedDealIds.has(deal.id) || deal.userSaved ? 2.2 : 1.5;
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
        storeWeights.set(
          storeKey,
          (storeWeights.get(storeKey) ?? 0) + signalWeight,
        );
      }

      if (brandKey) {
        brandWeights.set(
          brandKey,
          (brandWeights.get(brandKey) ?? 0) + signalWeight,
        );
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
        return (
          total + (recommendationSignals.titleTokenWeights.get(token) ?? 0)
        );
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
  }, [
    activeDiscoveryPreset,
    deals,
    hasLikedSignals,
    likedSeedDeals,
    recommendationSignals,
  ]);

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

  const clearSearchInput = () => {
    handleSearchInputChange("");
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
  const currentRegionMeta = getRegionMeta(region);
  const nextRegionMeta = getRegionMeta(getNextRegion(region));
  const activeSearchPrompt = SEARCH_PROMPTS[searchPromptIndex];
  const shouldShowSearchCricketPass =
    region === "INDIA" && shouldAnimateSearchCricket;
  const shouldShowSearchWicket =
    region === "INDIA" &&
    shouldAnimateSearchCricket &&
    !searchValue.trim().length;
  const shouldShowMyntraCarousel = region === "INDIA";
  const prefetchedAmazonDeals = homePublicBootstrap?.amazonDeals;
  const prefetchedMyntraDeals = homePublicBootstrap?.myntraDeals;
  const isBecauseYouLikedThis = activeDiscoveryPreset === "liked";
  const isTodayPicks =
    !isBecauseYouLikedThis && sortBy === "newest" && !minDiscount;
  const isTrendingStores = !isBecauseYouLikedThis && sortBy === "popular";
  const isBigDrops =
    !isBecauseYouLikedThis &&
    !isTrendingStores &&
    (sortBy === "discount" || (minDiscount ?? 0) >= 50);

  const applyDiscoveryPreset = (
    preset: "today" | "trending" | "drops" | "liked",
  ) => {
    if (preset === "liked") {
      if (!hasLikedSignals) {
        return;
      }

      setActiveDiscoveryPreset("liked");
      setSortBy("newest");
      setMinDiscount(null);
      setDiscoveryPreset("liked");
      return;
    }

    setActiveDiscoveryPreset(null);

    if (preset === "today") {
      setSortBy("newest");
      setMinDiscount(null);
      setDiscoveryPreset("today");
      return;
    }
    if (preset === "trending") {
      setSortBy("popular");
      setMinDiscount(null);
      setDiscoveryPreset("trending");
      return;
    }
    setSortBy("discount");
    setMinDiscount(50);
    setDiscoveryPreset("drops");
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
        <HomeTopBar
          isHomeTopBarHidden={isHomeTopBarHidden}
          searchValue={searchValue}
          onSearchSubmit={handleSearch}
          onSearchInputChange={handleSearchInputChange}
          onClearSearch={clearSearchInput}
          activeSearchPrompt={activeSearchPrompt}
          searchPromptIndex={searchPromptIndex}
          shouldShowSearchCricketPass={shouldShowSearchCricketPass}
          shouldShowSearchWicket={shouldShowSearchWicket}
          desktopSearchBallRef={desktopSearchBallRef}
          desktopSearchWicketRef={desktopSearchWicketRef}
          mobileSearchBallRef={mobileSearchBallRef}
          mobileSearchWicketRef={mobileSearchWicketRef}
          isAuthenticated={isAuthenticated}
          user={user}
          unreadNotificationCount={unreadNotificationCount}
          onLogout={logout}
          onGoogleLogin={handleGoogleLogin}
          onFilterOpen={() => setFilterOpen(true)}
          onResetToHomeDefault={resetToHomeDefault}
          currentRegionMeta={currentRegionMeta}
          nextRegionMeta={nextRegionMeta}
          onToggleRegion={toggleRegion}
          isTodayPicks={isTodayPicks}
          isTrendingStores={isTrendingStores}
          isBigDrops={isBigDrops}
          isBecauseYouLikedThis={isBecauseYouLikedThis}
          hasLikedSignals={hasLikedSignals}
          onDiscoveryPreset={applyDiscoveryPreset}
          categories={categoriesList}
          selectedCategory={category}
          onSelectCategory={setCategory}
          shouldLoadCategoryMoreMenu={shouldLoadCategoryMoreMenu}
          onTriggerCategoryMoreMenuLoad={triggerCategoryMoreMenuLoad}
          isMobileViewport={isMobileViewport}
          shouldLoadMobileFilters={shouldLoadMobileFilters}
          onTriggerMobileFiltersLoad={() => setShouldLoadMobileFilters(true)}
        />


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
              <div className="lg:hidden">
                <HomeWalkthroughInline />
              </div>

              {shouldShowMyntraCarousel ? (
                <div className="mb-6 hidden lg:grid lg:grid-cols-[minmax(0,1.18fr)_360px] lg:items-stretch lg:gap-4 xl:grid-cols-[minmax(0,1.16fr)_380px] min-[1700px]:mb-12 min-[1700px]:grid-cols-[minmax(0,1.08fr)_430px] min-[1700px]:gap-5">
                  <HomeWalkthroughInline
                    unbounded
                    className="mb-0 min-[1700px]:justify-self-center min-[1700px]:max-w-[1240px]"
                  />
                  <MyntraHeroCarousel
                    region={region}
                    deals={prefetchedMyntraDeals}
                    queryEnabled={!shouldHoldDealsQueryForBootstrap}
                    loading={shouldHoldDealsQueryForBootstrap}
                  />
                </div>
              ) : (
                <div className="hidden lg:block">
                  <HomeWalkthroughInline className="mb-6" />
                </div>
              )}

              <AmazonDealsSplitCarousel
                region={region}
                deals={prefetchedAmazonDeals}
                queryEnabled={!shouldHoldDealsQueryForBootstrap}
                loading={shouldHoldDealsQueryForBootstrap}
              />
              {shouldShowMyntraCarousel ? (
                <MyntraHeroCarousel
                  region={region}
                  variant="mobile"
                  deals={prefetchedMyntraDeals}
                  queryEnabled={!shouldHoldDealsQueryForBootstrap}
                  loading={shouldHoldDealsQueryForBootstrap}
                />
              ) : null}
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

