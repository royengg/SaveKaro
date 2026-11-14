import { useEffect, useState } from "react";
import type { Deal } from "@/store/filterStore";

interface MasonryPaginationOptions {
  deals: readonly Deal[];
  enabled: boolean;
  loadNextPage: () => Promise<unknown>;
}

/** Prefetch before the shortest column runs out, not after the tallest one. */
export function useMasonryPagination({
  deals,
  enabled,
  loadNextPage,
}: MasonryPaginationOptions) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!container || !enabled || !deals.length) return;
    const root = container;

    let frame = 0;
    let requested = false;
    const columns = new Set<Element>();
    const scheduleCheck = () => {
      if (!frame) frame = window.requestAnimationFrame(checkColumns);
    };
    const resizeObserver = new ResizeObserver(scheduleCheck);

    function checkColumns() {
      frame = 0;
      const currentColumns = root.querySelectorAll(".masonry-grid_column");
      for (const column of columns) {
        if (!root.contains(column)) {
          resizeObserver.unobserve(column);
          columns.delete(column);
        }
      }
      for (const column of currentColumns) {
        if (!columns.has(column)) {
          columns.add(column);
          resizeObserver.observe(column);
        }
      }

      // One viewport of lookahead also covers quick scrolls past a column end.
      const prefetchEdge = window.innerHeight * 2;
      if (
        requested ||
        !currentColumns.length ||
        root.getBoundingClientRect().top > prefetchEdge ||
        !Array.from(currentColumns).some(
          (column) => column.getBoundingClientRect().bottom <= prefetchEdge,
        )
      ) {
        return;
      }

      requested = true;
      // Query state controls retries and starts a fresh check after each page.
      void loadNextPage().catch(() => {
        // The query exposes failures to the existing error/retry UI.
      });
    }

    // Lazy mounting and responsive column changes may replace observed nodes.
    const mutationObserver = new MutationObserver(scheduleCheck);
    mutationObserver.observe(root, { childList: true, subtree: true });
    resizeObserver.observe(root);
    window.addEventListener("scroll", scheduleCheck, { passive: true });
    window.addEventListener("resize", scheduleCheck);
    scheduleCheck();

    return () => {
      window.cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("scroll", scheduleCheck);
      window.removeEventListener("resize", scheduleCheck);
    };
  }, [container, deals, enabled, loadNextPage]);

  return setContainer;
}
