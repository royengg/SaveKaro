import { useLayoutEffect, useRef } from "react";
import { animate } from "motion";

// Motion timings from https://dannyjpwilliams.com/playground/morphing-menu/
const spring = { type: "spring", duration: 0.4, bounce: 0.24 } as const;
const compression = { duration: 0.1, ease: [0.4, 0, 0.2, 1] } as const;

export function useMobileDockMotion(expanded: boolean) {
  const shellRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousExpanded = useRef(expanded);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const bar = barRef.current;
    const panel = panelRef.current;
    if (!shell || !bar || !panel) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const rows = Array.from(panel.querySelectorAll<HTMLElement>("[data-dock-row]"));
    const animations: ReturnType<typeof animate>[] = [];
    let cancelled = false;
    const track = (animation: ReturnType<typeof animate>) => {
      animations.push(animation);
      return animation;
    };
    const stop = () => {
      cancelled = true;
      animations.splice(0).forEach((animation) => animation.stop());
    };
    const targetSize = () => {
      const content = expanded ? panel : bar;
      return { width: content.offsetWidth, height: content.offsetHeight };
    };
    const setSize = () => {
      const { width, height } = targetSize();
      shell.style.width = width ? `${width}px` : "";
      shell.style.height = height ? `${height}px` : "";
    };
    const setContent = (snap: boolean) => {
      const reducedMotion = motionPreference.matches;
      track(animate(bar, {
        opacity: expanded ? 0 : 1,
        scale: expanded && !reducedMotion ? 0.8 : 1,
        filter: expanded && !reducedMotion ? "blur(8px)" : "blur(0px)",
      }, {
        duration: snap ? 0 : expanded ? 0.15 : 0.22,
        delay: !snap && !expanded ? 0.08 : 0,
        ...(!expanded ? { ease: "easeOut" as const } : {}),
      }));

      rows.forEach((row, index) => {
        if (expanded && !snap) {
          Object.assign(row.style, {
            opacity: "0",
            transform: "translateY(48px)",
            filter: "blur(4px)",
          });
        }
        track(animate(row, {
          opacity: expanded ? 1 : 0,
          y: expanded || reducedMotion ? 0 : 16,
          filter: expanded || reducedMotion ? "blur(0px)" : "blur(2px)",
        }, {
          ...spring,
          duration: snap ? 0 : expanded ? 0.4 : 0.12,
          bounce: 0.3,
          delay: !snap && expanded ? 0.2 + index * 0.02 : 0,
        }));
      });
    };

    const changed = previousExpanded.current !== expanded;
    previousExpanded.current = expanded;
    const snap = motionPreference.matches || !changed || !bar.offsetWidth;
    if (snap) {
      setSize();
    } else {
      const width = Math.min(bar.offsetWidth, bar.offsetWidth > 250 ? 280 : 200);
      const height = bar.offsetHeight > 52 ? 32 : 28;
      const pinch = track(animate(shell, { width, height }, compression));
      void pinch.finished.then(() => {
        if (!cancelled) {
          track(animate(shell, targetSize(), { ...spring, bounce: expanded ? 0.24 : 0.15 }));
        }
      }).catch(() => {
        // Closing or resizing can interrupt the pinch before its spring starts.
      });
    }
    setContent(snap);

    const synchronize = () => {
      stop();
      setSize();
      setContent(true);
    };
    window.addEventListener("resize", synchronize);
    motionPreference.addEventListener("change", synchronize);
    return () => {
      stop();
      window.removeEventListener("resize", synchronize);
      motionPreference.removeEventListener("change", synchronize);
    };
  }, [expanded]);

  return { shellRef, barRef, panelRef };
}
