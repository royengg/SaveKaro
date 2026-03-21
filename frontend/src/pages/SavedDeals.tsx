import { Link } from "react-router-dom";
import { ArrowLeft, Bookmark, BookmarkX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSavedDeals } from "@/hooks/useDeals";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import DealCard from "@/components/deals/DealCard";
import Header from "@/components/layout/Header";
import Masonry from "react-masonry-css";

export default function SavedDeals() {
  const { isAuthenticated } = useAuthStore();
  const { resetFilters } = useFilterStore();
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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_28%),linear-gradient(180deg,#fff_0%,#fcfcfd_38%,#f8fafc_100%)]">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="surface-liquid-glass rounded-[28px] p-8">
            <BookmarkX className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h1 className="mb-4 text-2xl font-bold">Sign in Required</h1>
            <p className="text-muted-foreground">
              Sign in to view your saved deals.
            </p>
          </div>
          <Link to="/" onClick={resetFilters}>
            <Button className="mt-4 h-10 rounded-full px-4 text-[15px] font-semibold">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.1),transparent_28%),linear-gradient(180deg,#fff_0%,#fcfcfd_38%,#f8fafc_100%)]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-5 pb-24 md:pb-10">
        <Link
          to="/"
          className="surface-liquid-chip inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-muted-foreground transition-[transform,color,background-color] duration-200 hover:-translate-y-[1px] hover:text-foreground active:scale-[0.98]"
          onClick={resetFilters}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Deals
        </Link>

        <section className="surface-liquid-glass mt-4 rounded-[30px] p-5 md:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.12),transparent_34%)]" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="surface-liquid-chip flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]">
                <Bookmark className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-[1.9rem] font-bold tracking-[-0.03em] text-foreground">
                  Saved Deals
                </h1>
                <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                  Your curated shortlist of deals worth revisiting before they
                  disappear or change price.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="surface-liquid-chip inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium text-foreground/80">
                    {deals?.length ?? 0} saved
                  </span>
                  <span className="surface-liquid-chip inline-flex h-8 items-center rounded-full px-3 text-[12px] font-medium text-foreground/80">
                    Quick revisit list
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Link to="/" onClick={resetFilters}>
                <Button className="h-10 rounded-full bg-foreground px-4 text-[15px] font-semibold text-background shadow-[0_18px_32px_-24px_rgba(15,23,42,0.42)] transition-[transform,box-shadow,background-color] duration-200 hover:-translate-y-[1px] hover:bg-foreground/92 active:scale-[0.985]">
                  Browse deals
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="mt-5">
            <Masonry
              breakpointCols={breakpointColumns}
              className="flex -ml-4 w-auto"
              columnClassName="pl-4 bg-clip-padding"
            >
              {[...Array(8)].map((_, i) => (
                <div key={i} className="mb-4">
                  <div className="surface-liquid-subtle rounded-[26px] p-3">
                    <Skeleton className="h-48 w-full rounded-[22px]" />
                    <div className="space-y-2 px-1 pt-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </Masonry>
          </div>
        ) : !deals || deals.length === 0 ? (
          <div className="surface-liquid-glass mt-5 rounded-[28px] px-6 py-14 text-center">
            <Bookmark className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No saved deals yet</h2>
            <p className="text-muted-foreground mb-6">
              Start saving deals by clicking the bookmark icon on any deal
            </p>
            <Link to="/" onClick={resetFilters}>
              <Button className="h-10 rounded-full px-4 text-[15px] font-semibold">
                Browse Deals
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground/80">
                Your shortlist
              </p>
            </div>

            <Masonry
              breakpointCols={breakpointColumns}
              className="flex -ml-4 w-auto"
              columnClassName="pl-4 bg-clip-padding"
            >
              {deals.map((deal: any) => (
                <div key={deal.id} className="mb-4">
                  <div className="rounded-[28px] border border-white/30 bg-white/18 p-1.5 backdrop-blur-sm">
                    <DealCard deal={{ ...deal, userSaved: true }} />
                  </div>
                </div>
              ))}
            </Masonry>
          </div>
        )}
      </main>
    </div>
  );
}
