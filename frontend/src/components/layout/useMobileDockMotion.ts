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
    let fitObserver: ResizeObserver | undefined;
    let cancelled = false;
    const track = (animation: ReturnType<typeof animate>) => {
      animations.push(animation);
      return animation;
    };
    const stop = () => {
      cancelled = true;
      fitObserver?.disconnect();
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
      shell.removeAttribute("data-dock-closing");
    };
    const animateBar = (visible: boolean, snap = false) => track(animate(bar, {
      opacity: visible ? 1 : 0,
      scale: visible || motionPreference.matches ? 1 : 0.8,
      filter: visible || motionPreference.matches ? "blur(0px)" : "blur(8px)",
    }, {
      duration: snap ? 0 : visible ? 0.18 : 0.08,
      ease: "easeOut",
    }));
    const animatePanel = (snap: boolean) => {
      const reducedMotion = motionPreference.matches;
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
    const settleImmediately = () => {
      setSize();
      animateBar(!expanded, true);
      animatePanel(true);
    };

    const changed = previousExpanded.current !== expanded;
    previousExpanded.current = expanded;
    const snap = motionPreference.matches || !changed || !bar.offsetWidth;
    if (snap) {
      settleImmediately();
    } else {
      shell.toggleAttribute("data-dock-closing", !expanded);
      const width = Math.min(bar.offsetWidth, bar.offsetWidth > 250 ? 280 : 200);
      const height = bar.offsetHeight > 52 ? 32 : 28;
      const morph = async () => {
        // Fade out the shortcuts before the shell can clip their highlights.
        await animateBar(false, !expanded).finished;
        if (cancelled) return;
        animatePanel(false);
        await track(animate(shell, { width, height }, compression)).finished;
        if (cancelled) return;

        shell.removeAttribute("data-dock-closing");
        track(animate(shell, targetSize(), { ...spring, bounce: expanded ? 0.24 : 0.15 }));
        if (!expanded) {
          fitObserver = new ResizeObserver(() => {
            if (cancelled || shell.offsetWidth < bar.offsetWidth || shell.offsetHeight < bar.offsetHeight) return;
            fitObserver?.disconnect();
            animateBar(true);
          });
          fitObserver.observe(shell);
        }
      };
      void morph().catch(() => {
        // Closing or resizing can interrupt the pinch before its spring starts.
      });
    }

    const synchronize = () => {
      stop();
      settleImmediately();
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
