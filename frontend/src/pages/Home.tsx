import { useEffect, useMemo } from "react";
import { useInView } from "react-intersection-observer";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileFilters } from "@/components/filters/MobileFilters";
import { DealGrid } from "@/components/deals/DealGrid";
import { useDeals } from "@/hooks/useDeals";
import { useFilterStore } from "@/store/filterStore";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";

export function Home() {
  const { category, store, minDiscount, search, sortBy } = useFilterStore();
  
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
  });

  // Infinite scroll trigger
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
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

  const totalDeals = data?.pages[0]?.pagination.total ?? 0;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      {/* Mobile Filters - shows only on mobile */}
      <MobileFilters />
      
      <main className="container mx-auto px-4 py-4 md:py-6">
        <div className="flex gap-8">
          {/* Desktop Sidebar - hidden on mobile */}
          <Sidebar />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-2">
              <div>
                <h1 className="text-xl md:text-2xl font-bold">
                  {category ? `${category.charAt(0).toUpperCase() + category.slice(1).replace("-", " ")} Deals` : "Latest Deals"}
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  {totalDeals > 0 ? `${totalDeals} deals found` : "Discover the best deals"}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="self-start sm:self-auto">
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {/* Error State */}
            {isError && (
              <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center px-4">
                <div className="text-5xl md:text-6xl mb-4">😕</div>
                <h3 className="text-lg md:text-xl font-semibold mb-2">Something went wrong</h3>
                <p className="text-sm md:text-base text-muted-foreground mb-4">
                  {error instanceof Error ? error.message : "Failed to load deals"}
                </p>
                <Button onClick={() => refetch()}>Try Again</Button>
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
                  <div ref={loadMoreRef} className="flex justify-center py-6 md:py-8">
                    {isFetchingNextPage && (
                      <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-primary" />
                    )}
                  </div>
                )}

                {/* End of Results */}
                {!hasNextPage && deals.length > 0 && (
                  <div className="text-center py-6 md:py-8 text-sm md:text-base text-muted-foreground">
                    You've seen all the deals! 🎉
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNav />
    </div>
  );
}

export default Home;
