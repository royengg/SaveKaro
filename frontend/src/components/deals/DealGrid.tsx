import Masonry from "react-masonry-css";
import { DealCard, DealCardSkeleton } from "./DealCard";
import type { Deal } from "@/store/filterStore";

interface DealGridProps {
  deals: Deal[];
  isLoading?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

const breakpointColumns = {
  default: 4,
  1280: 4,
  1024: 3,
  768: 2,
  640: 1,
};

export function DealGrid({ deals, isLoading, isFetchingNextPage }: DealGridProps) {
  if (isLoading) {
    return (
      <Masonry
        breakpointCols={breakpointColumns}
        className="masonry-grid"
        columnClassName="masonry-grid_column"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="mb-4">
            <DealCardSkeleton />
          </div>
        ))}
      </Masonry>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold mb-2">No deals found</h3>
        <p className="text-muted-foreground max-w-md">
          We couldn't find any deals matching your criteria. Try adjusting your filters or check back later for new deals!
        </p>
      </div>
    );
  }

  return (
    <>
      <Masonry
        breakpointCols={breakpointColumns}
        className="masonry-grid"
        columnClassName="masonry-grid_column"
      >
        {deals.map((deal) => (
          <div key={deal.id} className="mb-4">
            <DealCard deal={deal} />
          </div>
        ))}
        {isFetchingNextPage &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={`loading-${i}`} className="mb-4">
              <DealCardSkeleton />
            </div>
          ))}
      </Masonry>
    </>
  );
}

export default DealGrid;
