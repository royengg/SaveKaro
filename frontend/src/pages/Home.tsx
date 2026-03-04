import { useState, useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { useSearchParams, Link } from "react-router-dom";
import { Search, User, LogIn, Store, Bell, PiggyBank } from "lucide-react";

import { FilterDialog } from "@/components/filters/FilterDialog";
import { MobileFilters } from "@/components/filters/MobileFilters";
import { DealGrid } from "@/components/deals/DealGrid";
import { useDeals, useCategories } from "@/hooks/useDeals";
import { useFilterStore } from "@/store/filterStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2 } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

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
  } = useFilterStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { data: categories } = useCategories();
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(search);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchValue);
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Filter Dialog */}
      <FilterDialog open={filterOpen} onOpenChange={setFilterOpen} />

      {/* Main Content */}
      <div>
        {/* Minimal Top Bar */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-between h-14 md:h-20 px-3 md:px-8">
            {/* Mobile Logo */}
            <Link to="/" className="md:hidden flex items-center gap-1.5">
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
                  onChange={(e) => setSearchValue(e.target.value)}
                />
              </div>
            </form>

            {/* User Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFilterOpen(true)}
                title="Filters"
                className="h-8 w-8 md:h-10 md:w-10"
              >
                <Store className="h-4 w-4" />
              </Button>

              {/* Notifications */}
              {isAuthenticated && (
                <Link to="/notifications">
                  <Button variant="ghost" size="icon" title="Notifications">
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
                className="text-xl"
              >
                {region === "INDIA" ? "🇮🇳" : "🌍"}
              </Button>
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={user?.avatarUrl || undefined}
                          alt={user?.name || "User"}
                        />
                        <AvatarFallback>
                          {user?.name?.charAt(0).toUpperCase() || (
                            <User className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        {user?.name && (
                          <p className="font-medium">{user.name}</p>
                        )}
                        {user?.email && (
                          <p className="w-[200px] truncate text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/saved">Saved Deals</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/alerts">Price Alerts</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/leaderboard">Leaderboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={logout}
                      className="text-destructive"
                    >
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleGoogleLogin}
                  title="Sign in with Google"
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
                className="pl-8 w-full h-8 text-sm rounded-full bg-secondary border-0"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </form>
          </div>

          {/* Category Navigation Bar */}
          <div className="border-b px-3 md:px-8 py-1.5 md:py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCategory(null)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  category === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              {categories?.slice(0, 6).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.slug)}
                  className={`hidden md:block shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    category === cat.slug
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat.name}
                </button>
              ))}

              {/* More Categories Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
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
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {categories?.map((cat) => (
                    <DropdownMenuItem
                      key={cat.id}
                      onClick={() => setCategory(cat.slug)}
                      className={category === cat.slug ? "bg-secondary" : ""}
                    >
                      {cat.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile Filters — inside sticky header so it sticks with everything else */}
          <MobileFilters />
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
              <DealGrid
                deals={deals}
                isLoading={isLoading}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
              />

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
