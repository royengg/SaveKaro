import { useEffect } from "react";
import {
  useUiStore,
  type HomeMobileChromeMode,
} from "@/store/uiStore";
import {
  MOBILE_CHROME_COMPACT_AFTER_PX,
  MOBILE_CHROME_FULL_RESTORE_PX,
  MOBILE_CHROME_HIDE_INTENT_PX,
  MOBILE_CHROME_PRIMARY_INTENT_PX,
  SCROLL_STOP_RESTORE_MS,
} from "@/lib/homeUtils";

/**
 * Manages the adaptive mobile chrome on the Home page.
 *
 * - Keeps the complete header near the top of the page.
 * - Collapses to a persistent floating search capsule while browsing down.
 * - Reveals the primary row only after sustained upward intent.
 * - Uses separate thresholds for each direction to avoid flicker.
 * - Applies a "scrolling" flag while active scrolling is in progress
 *   (used to soften bottom-edge chrome).
 *
 * No-ops when `isMobileViewport` is false.
 */
export function useHomeMobileChrome(isMobileViewport: boolean): void {
  const setHomeMobileChromeMode = useUiStore(
    (s) => s.setHomeMobileChromeMode,
  );
  const setHomeChromeScrolling = useUiStore((s) => s.setHomeChromeScrolling);
  const setHomeSearchFocused = useUiStore((s) => s.setHomeSearchFocused);

  useEffect(() => {
    if (!isMobileViewport) {
      setHomeMobileChromeMode("full");
      setHomeChromeScrolling(false);
      setHomeSearchFocused(false);
      return;
    }

    const initialScrollY = Math.max(window.scrollY, 0);
    let chromeMode: HomeMobileChromeMode =
      initialScrollY <= MOBILE_CHROME_FULL_RESTORE_PX ? "full" : "compact";
    let isScrolling = false;
    let lastScrollY = initialScrollY;
    let lastDirection: "up" | "down" | null = null;
    let directionalDistance = 0;
    let stopTimer: number | null = null;

    setHomeMobileChromeMode(chromeMode);

    const setChromeMode = (next: HomeMobileChromeMode) => {
      if (chromeMode === next) {
        return;
      }
      chromeMode = next;
      setHomeMobileChromeMode(next);
    };

    const setScrolling = (next: boolean) => {
      if (isScrolling === next) {
        return;
      }
      isScrolling = next;
      setHomeChromeScrolling(next);
    };

    const handleScroll = () => {
      const currentScrollY = Math.max(window.scrollY, 0);
      const delta = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;

      if (currentScrollY <= MOBILE_CHROME_FULL_RESTORE_PX) {
        if (stopTimer !== null) {
          window.clearTimeout(stopTimer);
          stopTimer = null;
        }
        directionalDistance = 0;
        lastDirection = null;
        setChromeMode("full");
        setScrolling(false);
        return;
      }

      if (useUiStore.getState().isHomeSearchFocused) {
        directionalDistance = 0;
        lastDirection = null;
        setScrolling(false);
        return;
      }

      if (Math.abs(delta) < 2) {
        return;
      }

      const direction = delta > 0 ? "down" : "up";
      if (direction !== lastDirection) {
        directionalDistance = 0;
        lastDirection = direction;
      }
      directionalDistance += Math.abs(delta);

      setScrolling(true);

      if (stopTimer !== null) {
        window.clearTimeout(stopTimer);
      }

      stopTimer = window.setTimeout(() => {
        setScrolling(false);
      }, SCROLL_STOP_RESTORE_MS);

      if (
        direction === "down" &&
        currentScrollY >= MOBILE_CHROME_COMPACT_AFTER_PX &&
        directionalDistance >= MOBILE_CHROME_HIDE_INTENT_PX
      ) {
        setChromeMode("compact");
        directionalDistance = 0;
        return;
      }

      if (
        direction === "up" &&
        chromeMode === "compact" &&
        directionalDistance >= MOBILE_CHROME_PRIMARY_INTENT_PX
      ) {
        setChromeMode("primary");
        directionalDistance = 0;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (stopTimer !== null) {
        window.clearTimeout(stopTimer);
      }
      setHomeMobileChromeMode("full");
      setHomeChromeScrolling(false);
      setHomeSearchFocused(false);
    };
  }, [
    isMobileViewport,
    setHomeChromeScrolling,
    setHomeMobileChromeMode,
    setHomeSearchFocused,
  ]);
}
