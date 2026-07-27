import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import Masonry from "react-masonry-css";
import { DealCard, DealCardSkeleton } from "./DealCard";
import type { Deal } from "@/store/filterStore";

interface DealGridProps {
  deals: Deal[];
  isLoading?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  isRefreshing?: boolean;
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
    onChange: (isVisible) => {
      if (isVisible) {
        setHasBeenVisible(true);
      }
    },
  });

  const shouldRenderCard = inView || hasBeenVisible;
  const shouldAnimateIn = hasBeenVisible && index < STAGGER_ANIMATION_COUNT;
  const animationDelay = shouldAnimateIn ? `${index * STAGGER_STEP_MS}ms` : undefined;

  return (
    <div
      ref={inViewRef}
      data-deal-grid-id={deal.id}
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
  isRefreshing,
}: DealGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const previousPositionsRef = useRef(new Map<string, DOMRect>());
  const dealIdentity = useMemo(
    () => deals.map((deal) => deal.id).join("|"),
    [deals],
  );

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const nodes = Array.from(
      grid.querySelectorAll<HTMLElement>("[data-deal-grid-id]"),
    );
    const nextPositions = new Map<string, DOMRect>();
    const shouldAnimate =
      previousPositionsRef.current.size > 0 &&
      window.matchMedia("(max-width: 767px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animations: Animation[] = [];

    nodes.forEach((node) => {
      const id = node.dataset.dealGridId;
      if (!id) return;

      const next = node.getBoundingClientRect();
      nextPositions.set(id, next);
      if (!shouldAnimate) return;

      const previous = previousPositionsRef.current.get(id);
      if (!previous) {
        animations.push(
          node.animate(
            [
              { opacity: 0, transform: "translateY(12px) scale(0.985)" },
              { opacity: 1, transform: "translateY(0) scale(1)" },
            ],
            {
              duration: 260,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            },
          ),
        );
        return;
      }

      const deltaX = previous.left - next.left;
      const deltaY = previous.top - next.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;

      animations.push(
        node.animate(
          [
            { transform: `translate(${deltaX}px, ${deltaY}px)` },
            { transform: "translate(0, 0)" },
          ],
          {
            duration: 320,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          },
        ),
      );
    });

    previousPositionsRef.current = nextPositions;
    return () => animations.forEach((animation) => animation.cancel());
  }, [dealIdentity]);

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
    <div
      ref={gridRef}
      className="motion-results-shell relative"
      aria-busy={isRefreshing || isFetchingNextPage}
    >
      {isRefreshing ? (
        <div
          className="motion-results-progress"
          role="progressbar"
          aria-label="Updating deals"
        />
      ) : null}
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
    </div>
  );
}

export default DealGrid;
