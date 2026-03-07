import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useInView } from "react-intersection-observer";
import { useSearchParams, Link } from "react-router-dom";
import { Search, LogIn, Store, Bell, PiggyBank, Sparkles, TrendingUp, Percent } from "lucide-react";
import { useDeals, useCategories } from "@/hooks/useDeals";
import { useFilterStore } from "@/store/filterStore";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { Category } from "@/store/filterStore";
import { FeaturedDealsCarousel } from "@/components/home/FeaturedDealsCarousel";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const SEARCH_DEBOUNCE_MS = 300;
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
  const { user, isAuthenticated, logout } = useAuthStore();
  const { data: categories } = useCategories();
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(search);

  // Keep local input state aligned when search is reset externally (nav/pig/home buttons).
  useEffect(() => {
    setSearchValue(search);
  }, [search]);

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
  });

  // Infinite scroll trigger
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: "200px",
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten paginated data
  const deals = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) ?? [];
  }, [data]);

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
    setSearchValue("");
    resetFilters();
    setSearchParams({}, { replace: true });
  };

  const categoriesList: Category[] = categories ?? [];
  const isTodayPicks = sortBy === "newest" && !minDiscount && !store;
  const isTrendingStores = sortBy === "popular";
  const isBigDrops = sortBy === "discount" || (minDiscount ?? 0) >= 50;

  const applyDiscoveryPreset = (preset: "today" | "trending" | "drops") => {
    if (preset === "today") {
      setSortBy("newest");
      setMinDiscount(null);
      return;
    }
    if (preset === "trending") {
      setSortBy("popular");
      return;
    }
    setSortBy("discount");
    setMinDiscount(50);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Filter Dialog */}
      {filterOpen ? (
        <Suspense fallback={null}>
          <FilterDialog open={filterOpen} onOpenChange={setFilterOpen} />
        </Suspense>
      ) : null}

      {/* Main Content */}
      <div>
        {/* Minimal Top Bar */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-between h-14 md:h-20 px-3 md:px-8">
            {/* Mobile Logo */}
            <Link
              to="/"
              className="md:hidden flex items-center gap-1.5"
              onClick={resetToHomeDefault}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E60023] shadow-sm">
                <PiggyBank className="h-4 w-4 text-white stroke-[1.5]" />
              </div>
              <span className="font-bold text-base">SaveKaro</span>
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
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFilterOpen(true)}
<<<<<<< Updated upstream
                title="Filters"
                aria-label="Filters"
                className="h-10 w-10"
=======
                title="Platform"
                aria-label="Platform"
                className="text-lg"
>>>>>>> Stashed changes
              >
                <Store className="h-4 w-4" />
              </Button>

              {/* Notifications */}
              {isAuthenticated && (
                <Link to="/notifications">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Notifications"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                  </Button>
                </Link>
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
                className="text-xl"
              >
                {region === "INDIA" ? "🇮🇳" : "🌍"}
              </Button>
              {isAuthenticated ? (
                <Suspense
                  fallback={
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full"
                    >
                      <div className="h-8 w-8 rounded-full bg-secondary" />
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
                >
                  <LogIn className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="md:hidden px-3 pb-2">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search deals..."
                className="pl-8 w-full h-9 text-sm rounded-full bg-secondary border-0"
                value={searchValue}
                onChange={(e) => handleSearchInputChange(e.target.value)}
              />
            </form>
          </div>

          {/* Discovery Strip */}
          <div className="px-3 md:px-8 py-2 border-t border-border/60 bg-gradient-to-r from-amber-50/45 via-background to-rose-50/40">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">
                Discover
              </span>

              <button
                onClick={() => applyDiscoveryPreset("today")}
                className={cn(
                  "shrink-0 inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  isTodayPicks
                    ? "bg-amber-200/30 border-amber-300/60 text-foreground"
                    : "bg-background/70 border-border text-muted-foreground hover:text-foreground",
                )}
                aria-label="Show today's picks"
                title="Today's picks"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Today's picks
              </button>

              <button
                onClick={() => applyDiscoveryPreset("trending")}
                className={cn(
                  "shrink-0 inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  isTrendingStores
                    ? "bg-sky-200/30 border-sky-300/60 text-foreground"
                    : "bg-background/70 border-border text-muted-foreground hover:text-foreground",
                )}
                aria-label="Show trending stores deals"
                title="Trending stores"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Trending stores
              </button>

              <button
                onClick={() => applyDiscoveryPreset("drops")}
                className={cn(
                  "shrink-0 inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  isBigDrops
                    ? "bg-emerald-200/35 border-emerald-300/60 text-foreground"
                    : "bg-background/70 border-border text-muted-foreground hover:text-foreground",
                )}
                aria-label="Show big drops"
                title="Big drops"
              >
                <Percent className="h-3.5 w-3.5" />
                Big drops
              </button>
            </div>
          </div>

          {/* Category Navigation Bar */}
          <div className="border-b px-3 md:px-8 py-1.5 md:py-3 bg-gradient-to-r from-background via-secondary/35 to-background">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setCategory(null)}
                className={`shrink-0 inline-flex min-h-9 items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-colors duration-200 ease-out ${
                  category === null
                    ? "text-foreground border-slate-400/40 bg-slate-400/15"
                    : "text-muted-foreground border-slate-300/40 bg-slate-300/10 hover:text-foreground"
                }`}
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/75 text-[11px] leading-none">
                  ✨
                </span>
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
                    {cat.icon || "🏷️"}
                  </span>
                  {cat.name}
                </button>
              ))}

              {/* More Categories Menu */}
              <Suspense
                fallback={
                  <Button variant="ghost" size="sm" className="gap-1.5">
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
            </div>
          </div>

          {/* Mobile Filters — inside sticky header so it sticks with everything else */}
          <Suspense fallback={<div className="h-12 border-b" />}>
            <MobileFilters />
          </Suspense>
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
              <FeaturedDealsCarousel deals={deals} isLoading={isLoading} />

              <Suspense fallback={<DealGridFallback />}>
                <DealGrid
                  deals={deals}
                  isLoading={isLoading}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                />
              </Suspense>

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
