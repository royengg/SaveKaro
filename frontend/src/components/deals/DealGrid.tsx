import { memo, useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import Masonry from "react-masonry-css";
import { DealCard, DealCardSkeleton } from "./DealCard";
import type { Deal } from "@/store/filterStore";

interface DealGridProps {
  deals: Deal[];
  isLoading?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

// Pinterest-style responsive columns
const breakpointColumns = {
  default: 5,
  1536: 5,
  1280: 4,
  1024: 3,
  768: 2,
  640: 1,
};

const ACTIVE_WINDOW_ROOT_MARGIN = "1000px 0px";
const STAGGER_ANIMATION_COUNT = 18;
const STAGGER_STEP_MS = 20;

interface WindowedDealGridItemProps {
  deal: Deal;
  index: number;
  isPriority: boolean;
}

function WindowedDealGridItemComponent({
  deal,
  index,
  isPriority,
}: WindowedDealGridItemProps) {
  const [hasBeenVisible, setHasBeenVisible] = useState(index < 16);
  const { ref: inViewRef, inView } = useInView({
    rootMargin: ACTIVE_WINDOW_ROOT_MARGIN,
    threshold: 0,
    initialInView: index < 16,
  });

  useEffect(() => {
    if (inView) {
      setHasBeenVisible(true);
    }
  }, [inView]);

  const shouldRenderCard = inView || hasBeenVisible;
  const shouldAnimateIn = hasBeenVisible && index < STAGGER_ANIMATION_COUNT;
  const animationDelay = shouldAnimateIn ? `${index * STAGGER_STEP_MS}ms` : undefined;

  return (
    <div
      ref={inViewRef}
      className={`mb-4 ${shouldAnimateIn ? "deal-card-reveal" : ""}`}
      style={{ animationDelay }}
    >
      {shouldRenderCard ? (
        <DealCard deal={deal} isPriority={isPriority} />
      ) : (
        <DealCardSkeleton seed={deal.id} />
      )}
    </div>
  );
}

const WindowedDealGridItem = memo(
  WindowedDealGridItemComponent,
  (prevProps, nextProps) =>
    prevProps.index === nextProps.index &&
    prevProps.isPriority === nextProps.isPriority &&
    prevProps.deal === nextProps.deal,
);

export function DealGrid({
  deals,
  isLoading,
  isFetchingNextPage,
}: DealGridProps) {
  if (isLoading) {
    return (
      <Masonry
        breakpointCols={breakpointColumns}
        className="masonry-grid"
        columnClassName="masonry-grid_column"
      >
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="mb-4">
            <DealCardSkeleton seed={i} />
          </div>
        ))}
      </Masonry>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-7xl mb-6">🔍</div>
        <h3 className="text-2xl font-semibold mb-3">No deals found</h3>
        <p className="text-muted-foreground max-w-md">
          We couldn't find any deals matching your criteria. Try adjusting your
          filters or check back later for new deals!
        </p>
      </div>
    );
  }

  return (
    <Masonry
      breakpointCols={breakpointColumns}
      className="masonry-grid"
      columnClassName="masonry-grid_column"
    >
      {deals.map((deal, index) => (
        <WindowedDealGridItem
          key={deal.id}
          deal={deal}
          index={index}
          isPriority={index === 0}
        />
      ))}
      {isFetchingNextPage &&
        Array.from({ length: 5 }).map((_, i) => (
          <div key={`loading-${i}`} className="mb-4">
            <DealCardSkeleton seed={`loading-${i}`} />
          </div>
        ))}
    </Masonry>
  );
}

export default DealGrid;
