import { useEffect, useRef, useState } from "react";
import type { DealRegion } from "@/store/filterStore";
import {
  cancelAnimations,
  playSearchCricketAnimation,
} from "@/components/home/SearchCricketIcons";
import {
  SEARCH_CRICKET_LOOP_MS,
  SEARCH_CRICKET_PASS_MS,
} from "@/lib/homeUtils";

interface SearchCricketRefs {
  desktopSearchBallRef: React.RefObject<HTMLSpanElement | null>;
  desktopSearchWicketRef: React.RefObject<HTMLSpanElement | null>;
  mobileSearchBallRef: React.RefObject<HTMLSpanElement | null>;
  mobileSearchWicketRef: React.RefObject<HTMLSpanElement | null>;
}

/**
 * Manages the cricket ball/wicket animation loop in the Home search bar.
 *
 * Runs only when `region === "INDIA"` and the user has not opted into
 * reduced motion. Pauses the wicket portion while search text is present.
 * Responds to live changes in the `prefers-reduced-motion` media query.
 */
export function useHomeSearchCricket(
  region: DealRegion,
  searchHasTextRef: React.RefObject<boolean>,
): SearchCricketRefs {
  const desktopSearchBallRef = useRef<HTMLSpanElement | null>(null);
  const desktopSearchWicketRef = useRef<HTMLSpanElement | null>(null);
  const mobileSearchBallRef = useRef<HTMLSpanElement | null>(null);
  const mobileSearchWicketRef = useRef<HTMLSpanElement | null>(null);

  const [shouldAnimate, setShouldAnimate] = useState<boolean>(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return true;
    }
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  // Keep shouldAnimate in sync with live OS preference changes.
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event: MediaQueryListEvent) => {
      setShouldAnimate(!event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      region !== "INDIA" ||
      !shouldAnimate
    ) {
      return;
    }

    const playAnimation = () => {
      const shouldAnimateWicket = !searchHasTextRef.current;
      playSearchCricketAnimation(
        desktopSearchBallRef.current,
        shouldAnimateWicket ? desktopSearchWicketRef.current : null,
        SEARCH_CRICKET_PASS_MS,
      );
      playSearchCricketAnimation(
        mobileSearchBallRef.current,
        shouldAnimateWicket ? mobileSearchWicketRef.current : null,
        SEARCH_CRICKET_PASS_MS,
      );
    };

    playAnimation();
    const intervalId = window.setInterval(
      playAnimation,
      SEARCH_CRICKET_LOOP_MS,
    );

    return () => {
      window.clearInterval(intervalId);
      cancelAnimations(desktopSearchBallRef.current);
      cancelAnimations(desktopSearchWicketRef.current);
      cancelAnimations(mobileSearchBallRef.current);
      cancelAnimations(mobileSearchWicketRef.current);
    };
  }, [region, shouldAnimate, searchHasTextRef]);

  return {
    desktopSearchBallRef,
    desktopSearchWicketRef,
    mobileSearchBallRef,
    mobileSearchWicketRef,
  };
}
