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
import type { Category } from "@/store/filterStore";
import { FeaturedDealsCarousel } from "@/components/home/FeaturedDealsCarousel";
import { AmazonDealsSplitCarousel } from "@/components/home/AmazonDealsSplitCarousel";
import { CouponDealsCarousel } from "@/components/home/CouponDealsCarousel";
import HomeWalkthroughInline from "@/components/home/HomeWalkthroughInline";
import MyntraHeroCarousel from "@/components/home/MyntraHeroCarousel";
import GuestEntryDialog from "@/components/home/GuestEntryDialog";
import { HomeTopBar } from "@/components/home/HomeTopBar";
import {
  API_URL,
  SEARCH_DEBOUNCE_MS,
  DEFERRED_CATEGORY_MENU_MS,
  DEFERRED_MOBILE_FILTERS_MS,
  SEARCH_PROMPT_CYCLE_MS,
  SEARCH_PROMPTS,
  GUEST_ENTRY_SESSION_KEY,
  runWhenIdle,
} from "@/lib/homeUtils";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useHomeMobileChrome } from "@/hooks/useHomeMobileChrome";
import { useHomeSearchCricket } from "@/hooks/useHomeSearchCricket";
import { useHomeRecommendations } from "@/hooks/useHomeRecommendations";

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
  const homeMobileChromeMode = useUiStore((s) => s.homeMobileChromeMode);
  const {
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
    logout,
  } = useAuthStore();
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(search);
  const [searchPromptIndex, setSearchPromptIndex] = useState(0);

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
  const searchHasTextRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const {
    desktopSearchBallRef,
    desktopSearchWicketRef,
    mobileSearchBallRef,
    mobileSearchWicketRef,
  } = useHomeSearchCricket(region, searchHasTextRef);
  useHomeMobileChrome(isMobileViewport);
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



  const {
    data,
    isLoading: isDealsLoading,
    isError: isDealsError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    isPlaceholderData,
    refetch: refetchDeals,
  } = useDeals({
    category,
    store,
    minDiscount,
    search,
    sortBy,
    region,
    retainAllPages: true,
    keepPreviousResults: isMobileViewport,
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

  const { displayDeals, hasLikedSignals } = useHomeRecommendations({
    deals,
    savedSignals,
    region,
    isAuthenticated,
    activeDiscoveryPreset,
  });

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
  const shouldShowSearchCricketPass = region === "INDIA";
  const shouldShowSearchWicket =
    region === "INDIA" &&
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
  const activeFilterCount = [
    category !== null,
    store !== null,
    minDiscount !== null,
    sortBy !== "newest",
  ].filter(Boolean).length;

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
          mobileChromeMode={homeMobileChromeMode}
          activeFilterCount={activeFilterCount}
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
                    isRefreshing={
                      isMobileViewport &&
                      ((isFetching && !isFetchingNextPage) ||
                        isPlaceholderData)
                    }
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
