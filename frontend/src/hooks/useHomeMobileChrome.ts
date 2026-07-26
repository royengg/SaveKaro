import { useEffect } from "react";
import { useUiStore } from "@/store/uiStore";
import {
  MOBILE_TOP_BAR_RESET_PX,
  MOBILE_TOP_BAR_HIDE_THRESHOLD_PX,
  MOBILE_TOP_BAR_SHOW_THRESHOLD_PX,
  SCROLL_STOP_RESTORE_MS,
} from "@/lib/homeUtils";

/**
 * Manages the mobile chrome show/hide behavior on the Home page.
 *
 * - Hides the sticky top bar when the user scrolls down past a threshold.
 * - Reveals it when the user scrolls back up.
 * - Applies a "scrolling" flag while active scrolling is in progress
 *   (used to soften bottom-edge chrome).
 *
 * No-ops when `isMobileViewport` is false.
 */
export function useHomeMobileChrome(isMobileViewport: boolean): void {
  const setHomeTopBarHidden = useUiStore((s) => s.setHomeTopBarHidden);
  const setHomeChromeScrolling = useUiStore((s) => s.setHomeChromeScrolling);

  useEffect(() => {
    if (!isMobileViewport) {
      setHomeTopBarHidden(false);
      setHomeChromeScrolling(false);
      return;
    }

    let isTopBarHidden = false;
    let isScrolling = false;
    let lastScrollY = Math.max(window.scrollY, 0);
    let lastDirection: "up" | "down" | null = null;
    let directionalDistance = 0;
    let stopTimer: number | null = null;

    const setTopBarHidden = (next: boolean) => {
      if (isTopBarHidden === next) {
        return;
      }
      isTopBarHidden = next;
      setHomeTopBarHidden(next);
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

      if (currentScrollY <= MOBILE_TOP_BAR_RESET_PX) {
        if (stopTimer !== null) {
          window.clearTimeout(stopTimer);
          stopTimer = null;
        }
        directionalDistance = 0;
        lastDirection = null;
        setTopBarHidden(false);
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
        directionalDistance >= MOBILE_TOP_BAR_HIDE_THRESHOLD_PX
      ) {
        setTopBarHidden(true);
        directionalDistance = 0;
        return;
      }

      if (
        direction === "up" &&
        directionalDistance >= MOBILE_TOP_BAR_SHOW_THRESHOLD_PX
      ) {
        setTopBarHidden(false);
        directionalDistance = 0;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (stopTimer !== null) {
        window.clearTimeout(stopTimer);
      }
      setHomeTopBarHidden(false);
      setHomeChromeScrolling(false);
    };
  }, [isMobileViewport, setHomeChromeScrolling, setHomeTopBarHidden]);
}
