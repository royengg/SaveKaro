import { useEffect, useRef } from "react";
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
 */
export function useHomeSearchCricket(
  region: DealRegion,
  shouldAnimate: boolean,
  searchHasTextRef: React.RefObject<boolean>,
): SearchCricketRefs {
  const desktopSearchBallRef = useRef<HTMLSpanElement | null>(null);
  const desktopSearchWicketRef = useRef<HTMLSpanElement | null>(null);
  const mobileSearchBallRef = useRef<HTMLSpanElement | null>(null);
  const mobileSearchWicketRef = useRef<HTMLSpanElement | null>(null);

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
