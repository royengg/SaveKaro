import { memo, useCallback, useEffect, useRef, useState } from "react";
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

const SKELETON_HEIGHT_PX = [128, 160, 192, 224, 256] as const;

const stableHash = (seed: string | number) => {
  const value = String(seed);
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const getStableSkeletonHeightPx = (seed: string | number) =>
  SKELETON_HEIGHT_PX[stableHash(seed) % SKELETON_HEIGHT_PX.length];

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
  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const itemRef = useRef<HTMLDivElement | null>(null);
  const { ref: inViewRef, inView } = useInView({
    rootMargin: ACTIVE_WINDOW_ROOT_MARGIN,
    threshold: 0,
    initialInView: index < 16,
  });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      itemRef.current = node;
      inViewRef(node);
    },
    [inViewRef],
  );

  useEffect(() => {
    const node = itemRef.current;
    if (!inView || !node || typeof ResizeObserver === "undefined") return;

    const updateHeight = () => {
      const nextHeight = Math.ceil(node.getBoundingClientRect().height);
      if (nextHeight > 0) {
        setMeasuredHeight(nextHeight);
      }
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView, deal.id]);

  const fallbackHeight = measuredHeight ?? getStableSkeletonHeightPx(deal.id) + 72;
  const shouldAnimateIn = index < STAGGER_ANIMATION_COUNT;
  const animationDelay = shouldAnimateIn ? `${index * STAGGER_STEP_MS}ms` : undefined;

  return (
    <div
      ref={setRefs}
      className={`mb-4 ${shouldAnimateIn ? "deal-card-reveal" : ""}`}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: `${fallbackHeight}px`,
        animationDelay,
      }}
    >
      {inView ? (
        <DealCard deal={deal} isPriority={isPriority} />
      ) : measuredHeight ? (
        <div className="rounded-2xl bg-secondary/40" style={{ height: fallbackHeight }} />
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
