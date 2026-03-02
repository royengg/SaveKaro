import { Link } from "react-router-dom";
import { ArrowLeft, Bookmark, BookmarkX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSavedDeals } from "@/hooks/useDeals";
import { useAuthStore } from "@/store/authStore";
import DealCard from "@/components/deals/DealCard";
import Header from "@/components/layout/Header";
import Masonry from "react-masonry-css";

export default function SavedDeals() {
  const { isAuthenticated } = useAuthStore();
  const { data: deals, isLoading } = useSavedDeals();

  const breakpointColumns = {
    default: 4,
    1280: 3,
    1024: 3,
    768: 2,
    640: 2,
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <BookmarkX className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">Sign in Required</h1>
          <p className="text-muted-foreground mb-6">
            Sign in to view your saved deals.
          </p>
          <Link to="/">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6 pb-24 md:pb-8">
        {/* Back button */}
        <Link
          to="/"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Deals
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Bookmark className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Saved Deals</h1>
            <p className="text-muted-foreground">
              {deals?.length
                ? `${deals.length} deal${deals.length === 1 ? "" : "s"} saved`
                : "Your bookmarked deals"}
            </p>
          </div>
        </div>

        {/* Deals grid */}
        {isLoading ? (
          <Masonry
            breakpointCols={breakpointColumns}
            className="flex -ml-4 w-auto"
            columnClassName="pl-4 bg-clip-padding"
          >
            {[...Array(8)].map((_, i) => (
              <div key={i} className="mb-4">
                <Skeleton className="w-full h-48 rounded-2xl" />
                <div className="pt-2 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </Masonry>
        ) : !deals || deals.length === 0 ? (
          <div className="text-center py-16">
            <Bookmark className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No saved deals yet</h2>
            <p className="text-muted-foreground mb-6">
              Start saving deals by clicking the bookmark icon on any deal
            </p>
            <Link to="/">
              <Button>Browse Deals</Button>
            </Link>
          </div>
        ) : (
          <Masonry
            breakpointCols={breakpointColumns}
            className="flex -ml-4 w-auto"
            columnClassName="pl-4 bg-clip-padding"
          >
            {deals.map((deal: any) => (
              <div key={deal.id} className="mb-4">
                <DealCard deal={{ ...deal, userSaved: true }} />
              </div>
            ))}
          </Masonry>
        )}
      </main>
    </div>
  );
}
