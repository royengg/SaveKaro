import { useState, useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { Search, User, LogIn, X } from "lucide-react";
import { IconRail } from "@/components/layout/IconRail";
import { BottomNav } from "@/components/layout/BottomNav";
import { FilterDialog } from "@/components/filters/FilterDialog";
import { MobileFilters } from "@/components/filters/MobileFilters";
import { DealGrid } from "@/components/deals/DealGrid";
import { useDeals } from "@/hooks/useDeals";
import { useFilterStore } from "@/store/filterStore";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function Home() {
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
    setStore,
    setMinDiscount,
  } = useFilterStore();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(search);

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

  // Active filters for chips
  const activeFilters = [
    category && { label: category, onRemove: () => setCategory(null) },
    store && { label: store, onRemove: () => setStore(null) },
    minDiscount && {
      label: `${minDiscount}%+ off`,
      onRemove: () => setMinDiscount(null),
    },
  ].filter(Boolean) as { label: string; onRemove: () => void }[];

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Icon Rail */}
      <IconRail onFilterClick={() => setFilterOpen(true)} />

      {/* Filter Dialog */}
      <FilterDialog open={filterOpen} onOpenChange={setFilterOpen} />

      {/* Main Content - offset for icon rail */}
      <div className="md:ml-24">
        {/* Minimal Top Bar */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-between h-20 px-4 md:px-8">
            {/* Mobile Logo */}
            <Link to="/" className="md:hidden flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70">
                <span className="text-lg">🔥</span>
              </div>
              <span className="font-bold text-lg">DealHunt</span>
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
                      <Link to="/settings">Settings</Link>
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
                  onClick={handleGoogleLogin}
                  className="rounded-full gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign in</span>
                </Button>
              )}
            </div>
          </div>

          {/* Active Filter Chips */}
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 px-4 md:px-6 pb-3 overflow-x-auto">
              {activeFilters.map((filter) => (
                <Badge
                  key={filter.label}
                  variant="secondary"
                  className="shrink-0 gap-1.5 py-1.5 px-3 rounded-full"
                >
                  {filter.label}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-foreground"
                    onClick={filter.onRemove}
                  />
                </Badge>
              ))}
            </div>
          )}
        </header>

        {/* Mobile Filters */}
        <MobileFilters />

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

      {/* Mobile Bottom Nav */}
      <BottomNav />
    </div>
  );
}

export default Home;
