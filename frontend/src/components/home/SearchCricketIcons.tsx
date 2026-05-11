import { forwardRef, useId, type CSSProperties } from "react";

export const CricketBallIcon = forwardRef<
  SVGSVGElement,
  {
    className?: string;
    style?: CSSProperties;
  }
>(function CricketBallIcon(
  {
    className,
    style,
  }: {
    className?: string;
    style?: CSSProperties;
  },
  ref,
) {
  const fillId = useId();
  const glossId = useId();

  return (
    <svg
      ref={ref}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <circle
        cx="10"
        cy="10"
        r="7.3"
        fill={`url(#${fillId})`}
        stroke="#7A1217"
        strokeWidth="0.55"
      />
      <ellipse
        cx="7.1"
        cy="5.4"
        rx="3.45"
        ry="2.1"
        fill={`url(#${glossId})`}
        opacity="0.9"
      />
      <path
        d="M6.55 2.8C8.45 5.15 9.22 7.36 9.88 10C10.54 12.64 11.31 14.85 13.21 17.2"
        stroke="#7F1217"
        strokeWidth="2.15"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M6.55 2.8C8.45 5.15 9.22 7.36 9.88 10C10.54 12.64 11.31 14.85 13.21 17.2"
        stroke="#FBF0DB"
        strokeWidth="1.08"
        strokeLinecap="round"
      />
      <path
        d="M5.42 4.45L6.72 5.36M5.95 6.15L7.24 7.06M8.38 9.16L9.68 10.08M9 11.03L10.31 11.94M11.43 14.04L12.74 14.96M11.96 15.74L13.26 16.66"
        stroke="#FFF4E2"
        strokeWidth="0.88"
        strokeLinecap="round"
      />
      <path
        d="M6.36 3.68L7.45 4.44M6.87 5.38L7.96 6.14M9.3 8.39L10.39 9.15M9.82 10.1L10.91 10.85M12.24 13.1L13.34 13.87M12.76 14.81L13.86 15.57"
        stroke="#F6E0BF"
        strokeWidth="0.82"
        strokeLinecap="round"
        opacity="0.96"
      />
      <defs>
        <radialGradient
          id={fillId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(6.7 5.6) rotate(53.4) scale(11.6)"
        >
          <stop stopColor="#F86B4A" />
          <stop offset="0.32" stopColor="#D93C2A" />
          <stop offset="0.72" stopColor="#A51B1E" />
          <stop offset="1" stopColor="#7D0E13" />
        </radialGradient>
        <radialGradient
          id={glossId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(7.1 5.2) rotate(27.2) scale(4.15 2.58)"
        >
          <stop stopColor="#FFD7BE" stopOpacity="0.92" />
          <stop offset="0.62" stopColor="#FFBE9D" stopOpacity="0.42" />
          <stop offset="1" stopColor="#FFBE9D" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
});

CricketBallIcon.displayName = "CricketBallIcon";

export const SearchWicketIcon = forwardRef<
  SVGSVGElement,
  {
    className?: string;
    style?: CSSProperties;
  }
>(function SearchWicketIcon(
  {
    className,
    style,
  }: {
    className?: string;
    style?: CSSProperties;
  },
  ref,
) {
  const stumpFillId = useId();
  const bailFillId = useId();

  return (
    <svg
      ref={ref}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M5.1 20.1H18.9"
        stroke="#8C6A3F"
        strokeWidth="1.05"
        strokeLinecap="round"
        opacity="0.34"
      />
      <g data-wicket-part="bail-left">
        <rect
          x="5.7"
          y="5.2"
          width="5.2"
          height="1.45"
          rx="0.72"
          fill={`url(#${bailFillId})`}
          stroke="#8C5F2B"
          strokeWidth="0.32"
        />
      </g>
      <g data-wicket-part="bail-right">
        <rect
          x="13.1"
          y="5.2"
          width="5.2"
          height="1.45"
          rx="0.72"
          fill={`url(#${bailFillId})`}
          stroke="#8C5F2B"
          strokeWidth="0.32"
        />
      </g>
      <g data-wicket-part="stump-left">
        <rect
          x="6.2"
          y="6.35"
          width="1.95"
          height="11.15"
          rx="0.92"
          fill={`url(#${stumpFillId})`}
          stroke="#8C5F2B"
          strokeWidth="0.36"
        />
        <path
          d="M7.17 7.25V16.55"
          stroke="#F8E2BC"
          strokeWidth="0.4"
          strokeLinecap="round"
          opacity="0.72"
        />
      </g>
      <g data-wicket-part="stump-middle">
        <rect
          x="11.03"
          y="6.1"
          width="1.95"
          height="11.45"
          rx="0.92"
          fill={`url(#${stumpFillId})`}
          stroke="#8C5F2B"
          strokeWidth="0.36"
        />
        <path
          d="M12 7V16.8"
          stroke="#F8E2BC"
          strokeWidth="0.4"
          strokeLinecap="round"
          opacity="0.72"
        />
      </g>
      <g data-wicket-part="stump-right">
        <rect
          x="15.85"
          y="6.35"
          width="1.95"
          height="11.15"
          rx="0.92"
          fill={`url(#${stumpFillId})`}
          stroke="#8C5F2B"
          strokeWidth="0.36"
        />
        <path
          d="M16.82 7.25V16.55"
          stroke="#F8E2BC"
          strokeWidth="0.4"
          strokeLinecap="round"
          opacity="0.72"
        />
      </g>
      <defs>
        <linearGradient
          id={stumpFillId}
          x1="6.2"
          y1="6.1"
          x2="17.8"
          y2="18"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#E7B56F" />
          <stop offset="0.48" stopColor="#CB8B42" />
          <stop offset="1" stopColor="#9D6228" />
        </linearGradient>
        <linearGradient
          id={bailFillId}
          x1="5.7"
          y1="5.2"
          x2="18.3"
          y2="7.1"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#F1C884" />
          <stop offset="0.52" stopColor="#D9984E" />
          <stop offset="1" stopColor="#B37231" />
        </linearGradient>
      </defs>
    </svg>
  );
});

SearchWicketIcon.displayName = "SearchWicketIcon";

export function cancelAnimations(node: Element | null) {
  if (!node) {
    return;
  }

  node.getAnimations().forEach((animation) => animation.cancel());
}

function animateWicketPart(
  part: Element | null,
  keyframes: Keyframe[],
  duration: number,
  transformOrigin: string,
) {
  if (!part) {
    return;
  }

  cancelAnimations(part);
  (part as HTMLElement).style.transformOrigin = transformOrigin;
  part.animate(keyframes, {
    duration,
    easing: "linear",
    fill: "both",
  });
}

export function playSearchCricketAnimation(
  ballNode: HTMLElement | null,
  wicketNode: HTMLElement | null,
  duration: number,
) {
  if (!ballNode) {
    return;
  }

  const trackWidth = ballNode.parentElement?.clientWidth ?? 0;
  if (trackWidth < 60) {
    return;
  }

  // Ball travels left → right, hitting wickets at the far-right end.
  const bounceOneX = Math.max(14, Math.min(trackWidth * 0.05, 22));
  const bounceTwoX = trackWidth * 0.2;
  const bounceThreeX = trackWidth * 0.42;
  const bounceFourX = trackWidth * 0.66;
  const tailX = trackWidth * 0.88;
  const endX = trackWidth + 28;

  // Ball completes its travel in the first ~60% of the total duration,
  // preserving the same visual speed as the original 1500ms animation.
  cancelAnimations(ballNode);
  ballNode.animate(
    [
      { offset: 0, opacity: 0, transform: "translate3d(-18px, -14px, 0) scale(0.9) rotate(-10deg)" },
      { offset: 0.03, opacity: 1, transform: "translate3d(-12px, -8px, 0) scale(0.95) rotate(8deg)" },
      { offset: 0.07, opacity: 1, transform: `translate3d(${bounceOneX}px, 16px, 0) scaleX(1.08) scaleY(0.9) rotate(120deg)` },
      { offset: 0.16, opacity: 1, transform: `translate3d(${bounceTwoX}px, 2px, 0) scale(1) rotate(196deg)` },
      { offset: 0.26, opacity: 1, transform: `translate3d(${bounceThreeX}px, 14px, 0) scaleX(1.04) scaleY(0.94) rotate(276deg)` },
      { offset: 0.37, opacity: 1, transform: `translate3d(${bounceFourX}px, 6px, 0) scale(0.98) rotate(384deg)` },
      { offset: 0.49, opacity: 1, transform: `translate3d(${tailX}px, 10px, 0) scale(0.95) rotate(486deg)` },
      { offset: 0.60, opacity: 0, transform: `translate3d(${endX}px, 9px, 0) scale(0.9) rotate(560deg)` },
      { offset: 1, opacity: 0, transform: `translate3d(${endX}px, 9px, 0) scale(0.9) rotate(560deg)` },
    ],
    { duration, easing: "linear", fill: "both" },
  );

  if (!wicketNode) {
    return;
  }

  // Wicket impact at ~50% when the ball reaches the right side.
  // The wobble holds until ~92%, giving ~1 second of broken state.
  cancelAnimations(wicketNode);
  wicketNode.animate(
    [
      { offset: 0, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
      { offset: 0.47, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
      { offset: 0.50, transform: "translate3d(-1px, 1px, 0) rotate(-10deg) scale(0.985)" },
      { offset: 0.54, transform: "translate3d(1px, -1px, 0) rotate(8deg) scale(1.02)" },
      { offset: 0.58, transform: "translate3d(-0.5px, 0, 0) rotate(-4deg) scale(0.995)" },
      { offset: 0.92, transform: "translate3d(-0.5px, 0, 0) rotate(-3deg) scale(0.996)" },
      { offset: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
    ],
    { duration, easing: "linear", fill: "both" },
  );

  const wicketSvg = wicketNode.querySelector("svg");
  if (!wicketSvg) {
    return;
  }

  animateWicketPart(
    wicketSvg.querySelector('[data-wicket-part="bail-left"]'),
    [
      { offset: 0, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
      { offset: 0.47, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
      { offset: 0.52, opacity: 1, transform: "translate3d(-7px, -6px, 0) rotate(-32deg) scale(0.95)" },
      { offset: 0.92, opacity: 1, transform: "translate3d(-7px, -6px, 0) rotate(-32deg) scale(0.95)" },
      { offset: 0.98, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
      { offset: 1, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
    ],
    duration, "35% 65%",
  );

  animateWicketPart(
    wicketSvg.querySelector('[data-wicket-part="bail-right"]'),
    [
      { offset: 0, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
      { offset: 0.47, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
      { offset: 0.52, opacity: 1, transform: "translate3d(7px, -6px, 0) rotate(32deg) scale(0.95)" },
      { offset: 0.92, opacity: 1, transform: "translate3d(7px, -6px, 0) rotate(32deg) scale(0.95)" },
      { offset: 0.98, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
      { offset: 1, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
    ],
    duration, "65% 65%",
  );

  animateWicketPart(
    wicketSvg.querySelector('[data-wicket-part="stump-left"]'),
    [
      { offset: 0, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
      { offset: 0.47, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
      { offset: 0.53, opacity: 1, transform: "translate3d(-5px, 2px, 0) rotate(-18deg) scaleY(0.98)" },
      { offset: 0.92, opacity: 1, transform: "translate3d(-5px, 2px, 0) rotate(-18deg) scaleY(0.98)" },
      { offset: 0.98, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
      { offset: 1, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
    ],
    duration, "center bottom",
  );

  animateWicketPart(
    wicketSvg.querySelector('[data-wicket-part="stump-middle"]'),
    [
      { offset: 0, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
      { offset: 0.47, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
      { offset: 0.53, opacity: 1, transform: "translate3d(1px, 2px, 0) rotate(6deg) scaleY(0.99)" },
      { offset: 0.92, opacity: 1, transform: "translate3d(1px, 2px, 0) rotate(6deg) scaleY(0.99)" },
      { offset: 0.98, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
      { offset: 1, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
    ],
    duration, "center bottom",
  );

  animateWicketPart(
    wicketSvg.querySelector('[data-wicket-part="stump-right"]'),
    [
      { offset: 0, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
      { offset: 0.47, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
      { offset: 0.53, opacity: 1, transform: "translate3d(5px, 2px, 0) rotate(18deg) scaleY(0.98)" },
      { offset: 0.92, opacity: 1, transform: "translate3d(5px, 2px, 0) rotate(18deg) scaleY(0.98)" },
      { offset: 0.98, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
      { offset: 1, opacity: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)" },
    ],
    duration, "center bottom",
  );
}
