import { Link } from "react-router-dom";
import { ArrowLeft, Bookmark, BookmarkX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSavedDeals } from "@/hooks/useDeals";
import { useAuthStore } from "@/store/authStore";
import { useFilterStore } from "@/store/filterStore";
import { cn } from "@/lib/utils";
import DealCard from "@/components/deals/DealCard";
import Header from "@/components/layout/Header";
import Masonry from "react-masonry-css";

export default function SavedDeals() {
  const { isAuthenticated } = useAuthStore();
  const { resetFilters } = useFilterStore();
  const { data: deals, isLoading } = useSavedDeals();
  const heroMetaPillClass =
    "surface-hero-pill inline-flex items-center rounded-full text-foreground/82";

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

        <section className="surface-liquid-glass mt-4 rounded-[28px] p-4 md:rounded-[30px] md:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.12),transparent_34%)]" />
          <div className="relative">
            <div className="flex items-start gap-3 md:gap-3.5">
              <div className="surface-liquid-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] md:h-12 md:w-12 md:rounded-[18px]">
                <Bookmark className="h-4.5 w-4.5 text-[#e60023] md:h-5 md:w-5" strokeWidth={2.2} />
              </div>
              <div>
                <h1 className="text-[1.6rem] font-bold tracking-[-0.03em] text-foreground md:text-[1.9rem]">
                  Saved Deals
                </h1>
                <p className="mt-1 max-w-xl text-[13px] leading-5 text-muted-foreground md:text-sm md:leading-6">
                  Your curated shortlist of deals worth revisiting before they
                  disappear or change price.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5 md:mt-3 md:gap-2">
                  <span
                    className={cn(
                      heroMetaPillClass,
                      "h-7 px-2.5 text-[11px] font-medium md:h-8 md:px-3 md:text-[12px]",
                    )}
                  >
                    {deals?.length ?? 0} saved
                  </span>
                  <span
                    className={cn(
                      heroMetaPillClass,
                      "h-7 px-2.5 text-[11px] font-medium md:h-8 md:px-3 md:text-[12px]",
                    )}
                  >
                    Quick revisit list
                  </span>
                </div>
              </div>
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
              <Button className="cta-dark-pill h-10 px-4 text-[15px] font-semibold">
                <span className="cta-dark-pill-icon">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </span>
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
