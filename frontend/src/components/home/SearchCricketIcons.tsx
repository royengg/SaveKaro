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
