import { useEffect, useRef, type RefObject } from "react";
import "./deal-feed-edge-blur.css";

export function DealFeedEdgeBlur({
  feedRef,
}: {
  feedRef: RefObject<HTMLElement | null>;
}) {
  const edgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const feed = feedRef.current;
    const edge = edgeRef.current;
    if (!feed || !edge) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const { top, bottom } = feed.getBoundingClientRect();
      const edgeBounds = edge.getBoundingClientRect();
      edge.toggleAttribute(
        "data-visible",
        window.scrollY > 1 &&
          top < edgeBounds.bottom &&
          bottom > (edgeBounds.top + edgeBounds.bottom) / 2,
      );
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(feed);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [feedRef]);

  return (
    <div ref={edgeRef} className="deal-feed-edge-blur" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}
