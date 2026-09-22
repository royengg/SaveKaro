import { useCallback, useEffect, useState } from "react";

/**
 * Tracks whether a section is close enough to prepare and whether it is
 * actually visible. The latter also follows document visibility so timers do
 * not keep running in background tabs.
 */
export function useViewportActivity<T extends HTMLElement>(
  nearRootMargin = "400px 0px",
) {
  const [node, setNode] = useState<T | null>(null);
  const ref = useCallback((nextNode: T | null) => setNode(nextNode), []);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState === "visible",
  );

  useEffect(() => {
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      const timeoutId = window.setTimeout(() => {
        setIsNearViewport(true);
        setIsIntersecting(true);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    const nearObserver = new IntersectionObserver(
      ([entry]) => setIsNearViewport(Boolean(entry?.isIntersecting)),
      { rootMargin: nearRootMargin },
    );
    const visibleObserver = new IntersectionObserver(
      ([entry]) => setIsIntersecting(Boolean(entry?.isIntersecting)),
      { threshold: 0 },
    );

    nearObserver.observe(node);
    visibleObserver.observe(node);
    return () => {
      nearObserver.disconnect();
      visibleObserver.disconnect();
    };
  }, [nearRootMargin, node]);

  useEffect(() => {
    const updateVisibility = () =>
      setIsDocumentVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  return {
    ref,
    isNearViewport,
    isActive: isIntersecting && isDocumentVisible,
  };
}
