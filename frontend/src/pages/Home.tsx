import {
  forwardRef,
  lazy,
  Suspense,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Search,
  X,
  LogIn,
  Store,
  Bell,
  BadgeInfo,
  Heart,
  SlidersHorizontal,
  BookOpen,
} from "lucide-react";
import {
  useDeals,
  useCategories,
  useHomeBootstrap,
  useHomeUserSummary,
} from "@/hooks/useDeals";
import { useFilterStore } from "@/store/filterStore";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { dedupeDeals } from "@/lib/dealDeduping";
import { getNextRegion, getRegionMeta } from "@/lib/regions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { Category, Deal } from "@/store/filterStore";
import { FeaturedDealsCarousel } from "@/components/home/FeaturedDealsCarousel";
import { AmazonDealsSplitCarousel } from "@/components/home/AmazonDealsSplitCarousel";
import { CouponDealsCarousel } from "@/components/home/CouponDealsCarousel";
import HomeWalkthroughInline from "@/components/home/HomeWalkthroughInline";
import MyntraHeroCarousel from "@/components/home/MyntraHeroCarousel";
import GuestEntryDialog from "@/components/home/GuestEntryDialog";
import SaveKaroMark from "@/components/brand/SaveKaroMark";
import DemoVideoDialog from "@/components/demo/DemoVideoDialog";
import { usePageMeta } from "@/hooks/usePageMeta";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const SEARCH_DEBOUNCE_MS = 300;
const SCROLL_STOP_RESTORE_MS = 140;
const IDLE_TASK_TIMEOUT_MS = 500;
const DEFERRED_CATEGORY_MENU_MS = 1400;
const DEFERRED_MOBILE_FILTERS_MS = 1200;
const MOBILE_TOP_BAR_RESET_PX = 12;
const MOBILE_TOP_BAR_HIDE_THRESHOLD_PX = 28;
const MOBILE_TOP_BAR_SHOW_THRESHOLD_PX = 16;
const SEARCH_CRICKET_LOOP_MS = 6000;
const SEARCH_CRICKET_PASS_MS = 1500;
const SEARCH_PROMPT_CYCLE_MS = 2800;
const SEARCH_PROMPTS = [
  "Search for electronics",
  "Search for fashion",
  "Search for food",
  "Search for gaming",
  "Search for beauty",
  "Search for travel",
] as const;
const FilterDialog = lazy(() => import("@/components/filters/FilterDialog"));
const MobileFilters = lazy(() => import("@/components/filters/MobileFilters"));
const DealGrid = lazy(() => import("@/components/deals/DealGrid"));
const AuthUserMenu = lazy(() => import("@/components/home/AuthUserMenu"));
const CategoryMoreMenu = lazy(
  () => import("@/components/home/CategoryMoreMenu"),
);

function DealGridFallback() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <div className="h-44 w-full rounded-2xl bg-secondary/60" />
          <div className="h-4 w-full rounded bg-secondary/70" />
          <div className="h-4 w-2/3 rounded bg-secondary/70" />
        </div>
      ))}
    </div>
  );
}

const DEFAULT_CATEGORY_TINT = "#64748b";
const GUEST_ENTRY_SESSION_KEY = "savekaro_guest_entry_dismissed";
type RecommendationSeed = {
  id: string;
  title: string;
  cleanTitle?: string | null;
  brand?: string | null;
  store?: string | null;
  region: Deal["region"];
  category?: {
    slug: string;
  } | null;
  userSaved?: boolean;
  userUpvote?: number | null;
};
const RECOMMENDATION_STOP_WORDS = new Set([
  "the",
  "and",
  "with",
  "from",
  "this",
  "that",
  "your",
  "for",
  "you",
  "deal",
  "deals",
  "offer",
  "offers",
  "sale",
  "today",
  "latest",
  "price",
  "best",
  "off",
  "flat",
  "upto",
  "only",
  "free",
  "check",
  "current",
  "store",
  "shop",
  "buy",
  "coupon",
  "promo",
  "code",
]);

type IdleCapableWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const runWhenIdle = (callback: () => void, timeout = IDLE_TASK_TIMEOUT_MS) => {
  const idleWindow = window as IdleCapableWindow;

  if (typeof idleWindow.requestIdleCallback === "function") {
    const idleId = idleWindow.requestIdleCallback(() => callback(), {
      timeout,
    });
    return () => {
      if (typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleId);
      }
    };
  }

  const timeoutId = window.setTimeout(callback, timeout);
  return () => window.clearTimeout(timeoutId);
};

function normalizeHexColor(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_CATEGORY_TINT;
  }

  const trimmed = value.trim();
  const shortHex = /^#([0-9a-f]{3})$/i;
  const longHex = /^#([0-9a-f]{6})$/i;

  if (longHex.test(trimmed)) {
    return trimmed;
  }

  const shortMatch = trimmed.match(shortHex);
  if (!shortMatch) {
    return DEFAULT_CATEGORY_TINT;
  }

  const [r, g, b] = shortMatch[1].split("");
  return `#${r}${r}${g}${g}${b}${b}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = normalizeHexColor(hex);
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
}

function getCategoryPillStyle(
  color: string | null | undefined,
  active: boolean,
): CSSProperties {
  const [r, g, b] = hexToRgb(color ?? DEFAULT_CATEGORY_TINT);
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${active ? 0.18 : 0.08})`,
    borderColor: `rgba(${r}, ${g}, ${b}, ${active ? 0.5 : 0.22})`,
    boxShadow: active
      ? `0 12px 20px -18px rgba(${r}, ${g}, ${b}, 0.95)`
      : "0 0 0 rgba(0,0,0,0)",
  };
}

function getCategoryIconStyle(
  color: string | null | undefined,
  active: boolean,
): CSSProperties {
  const [r, g, b] = hexToRgb(color ?? DEFAULT_CATEGORY_TINT);
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${active ? 0.26 : 0.14})`,
  };
}

function normalizePreferenceValue(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function tokenizeRecommendationText(
  ...values: Array<string | null | undefined>
): string[] {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  const tokens = text
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter(
      (token) => token.length >= 3 && !RECOMMENDATION_STOP_WORDS.has(token),
    );

  return Array.from(new Set(tokens));
}

function PicksIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M8 2.4V4.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M8 11.9V13.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M2.4 8H4.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M11.9 8H13.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M4.3 4.3L5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M10.5 10.5L11.7 11.7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M4.3 11.7L5.5 10.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M10.5 5.5L11.7 4.3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="8" cy="8" r="1.35" fill="currentColor" />
    </svg>
  );
}

function TrendIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M2.2 11.8H13.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M3.1 8.1L5.9 6.5L8.2 7.4L12.1 4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.4 4.5H12.1V6.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DropsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4.2 11.8L11.8 4.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="5" cy="5" r="1.5" fill="currentColor" />
      <circle cx="11" cy="11" r="1.5" fill="currentColor" />
    </svg>
  );
}

const CricketBallIcon = forwardRef<
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

const SearchWicketIcon = forwardRef<
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

function SearchPromptOverlay({
  prompt,
  promptKey,
  className,
  textClassName,
}: {
  prompt: string;
  promptKey: number;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute top-1/2 -translate-y-1/2 overflow-hidden text-muted-foreground/88 transition-opacity duration-150 peer-focus:opacity-0",
        className,
      )}
    >
      <span
        key={promptKey}
        className={cn(
          "motion-search-prompt-rise block whitespace-nowrap",
          textClassName,
        )}
      >
        {prompt}
      </span>
    </span>
  );
}

CricketBallIcon.displayName = "CricketBallIcon";
SearchWicketIcon.displayName = "SearchWicketIcon";

function cancelAnimations(node: Element | null) {
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

function playSearchCricketAnimation(
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

  const impactX = -Math.max(14, Math.min(trackWidth * 0.05, 22));
  const bounceOneX = -(trackWidth * 0.2);
  const bounceTwoX = -(trackWidth * 0.42);
  const bounceThreeX = -(trackWidth * 0.66);
  const tailX = -(trackWidth * 0.88);
  const endX = -(trackWidth + 28);

  cancelAnimations(ballNode);
  ballNode.animate(
    [
      {
        offset: 0,
        opacity: 0,
        transform: "translate3d(18px, -14px, 0) scale(0.9) rotate(10deg)",
      },
      {
        offset: 0.05,
        opacity: 1,
        transform: "translate3d(12px, -8px, 0) scale(0.95) rotate(-8deg)",
      },
      {
        offset: 0.12,
        opacity: 1,
        transform: `translate3d(${impactX}px, 16px, 0) scaleX(1.08) scaleY(0.9) rotate(-120deg)`,
      },
      {
        offset: 0.26,
        opacity: 1,
        transform: `translate3d(${bounceOneX}px, 2px, 0) scale(1) rotate(-196deg)`,
      },
      {
        offset: 0.44,
        opacity: 1,
        transform: `translate3d(${bounceTwoX}px, 14px, 0) scaleX(1.04) scaleY(0.94) rotate(-276deg)`,
      },
      {
        offset: 0.62,
        opacity: 1,
        transform: `translate3d(${bounceThreeX}px, 6px, 0) scale(0.98) rotate(-384deg)`,
      },
      {
        offset: 0.82,
        opacity: 1,
        transform: `translate3d(${tailX}px, 10px, 0) scale(0.95) rotate(-486deg)`,
      },
      {
        offset: 1,
        opacity: 0,
        transform: `translate3d(${endX}px, 9px, 0) scale(0.9) rotate(-560deg)`,
      },
    ],
    {
      duration,
      easing: "linear",
      fill: "both",
    },
  );

  if (!wicketNode) {
    return;
  }

  cancelAnimations(wicketNode);
  wicketNode.animate(
    [
      { offset: 0, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
      {
        offset: 0.13,
        transform: "translate3d(-1px, 1px, 0) rotate(-10deg) scale(0.985)",
      },
      {
        offset: 0.18,
        transform: "translate3d(1px, -1px, 0) rotate(8deg) scale(1.02)",
      },
      {
        offset: 0.26,
        transform: "translate3d(-0.5px, 0, 0) rotate(-4deg) scale(0.995)",
      },
      { offset: 0.34, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
      { offset: 1, transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)" },
    ],
    {
      duration,
      easing: "linear",
      fill: "both",
    },
  );

  const wicketSvg = wicketNode.querySelector("svg");
  if (!wicketSvg) {
    return;
  }

  animateWicketPart(
    wicketSvg.querySelector('[data-wicket-part="bail-left"]'),
    [
      {
        offset: 0,
        opacity: 1,
        transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)",
      },
      {
        offset: 0.16,
        opacity: 1,
        transform: "translate3d(-7px, -6px, 0) rotate(-32deg) scale(0.95)",
      },
      {
        offset: 0.86,
        opacity: 1,
        transform: "translate3d(-7px, -6px, 0) rotate(-32deg) scale(0.95)",
      },
      {
        offset: 0.985,
        opacity: 1,
        transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)",
      },
      {
        offset: 1,
        opacity: 1,
        transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)",
      },
    ],
    duration,
    "35% 65%",
  );

  animateWicketPart(
    wicketSvg.querySelector('[data-wicket-part="bail-right"]'),
    [
      {
        offset: 0,
        opacity: 1,
        transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)",
      },
      {
        offset: 0.16,
        opacity: 1,
        transform: "translate3d(7px, -6px, 0) rotate(32deg) scale(0.95)",
      },
      {
        offset: 0.86,
        opacity: 1,
        transform: "translate3d(7px, -6px, 0) rotate(32deg) scale(0.95)",
      },
      {
        offset: 0.985,
        opacity: 1,
        transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)",
      },
      {
        offset: 1,
        opacity: 1,
        transform: "translate3d(0, 0, 0) rotate(0deg) scale(1)",
      },
    ],
    duration,
    "65% 65%",
  );

  animateWicketPart(
    wicketSvg.querySelector('[data-wicket-part="stump-left"]'),
    [
      {
        offset: 0,
        opacity: 1,
        transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)",
      },
      {
        offset: 0.17,
        opacity: 1,
        transform: "translate3d(-5px, 2px, 0) rotate(-18deg) scaleY(0.98)",
      },
      {
        offset: 0.86,
        opacity: 1,
        transform: "translate3d(-5px, 2px, 0) rotate(-18deg) scaleY(0.98)",
      },
      {
        offset: 0.985,
        opacity: 1,
        transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)",
      },
      {
        offset: 1,
        opacity: 1,
        transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)",
      },
    ],
    duration,
    "center bottom",
  );

  animateWicketPart(
    wicketSvg.querySelector('[data-wicket-part="stump-middle"]'),
    [
      {
        offset: 0,
        opacity: 1,
        transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)",
      },
      {
        offset: 0.17,
        opacity: 1,
        transform: "translate3d(1px, 2px, 0) rotate(6deg) scaleY(0.99)",
      },
      {
        offset: 0.86,
        opacity: 1,
        transform: "translate3d(1px, 2px, 0) rotate(6deg) scaleY(0.99)",
      },
      {
        offset: 0.985,
        opacity: 1,
        transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)",
      },
      {
        offset: 1,
        opacity: 1,
        transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)",
      },
    ],
    duration,
    "center bottom",
  );

  animateWicketPart(
    wicketSvg.querySelector('[data-wicket-part="stump-right"]'),
    [
      {
        offset: 0,
        opacity: 1,
        transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)",
      },
      {
        offset: 0.17,
        opacity: 1,
        transform: "translate3d(5px, 2px, 0) rotate(18deg) scaleY(0.98)",
      },
      {
        offset: 0.86,
        opacity: 1,
        transform: "translate3d(5px, 2px, 0) rotate(18deg) scaleY(0.98)",
      },
      {
        offset: 0.985,
        opacity: 1,
        transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)",
      },
      {
        offset: 1,
        opacity: 1,
        transform: "translate3d(0, 0, 0) rotate(0deg) scaleY(1)",
      },
    ],
    duration,
    "center bottom",
  );
}
export function Home() {
  usePageMeta({
    title: "SaveKaro — Best Deals, Discounts & Offers in India",
    description:
      "Find the hottest deals, discounts, and offers in India across Amazon, Myntra, electronics, fashion, gaming, and more on SaveKaro.",
    canonicalPath: "/",
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const {
    category,
    store,
    minDiscount,
    search,
    sortBy,
    region,
    toggleRegion,
    setSearch,
    setCategory,
    setSortBy,
    setMinDiscount,
    resetFilters,
  } = useFilterStore();
  const { isHomeTopBarHidden, setHomeTopBarHidden, setHomeChromeScrolling } =
    useUiStore();
  const {
    user,
    isAuthenticated,
    isLoading: isAuthLoading,
    logout,
  } = useAuthStore();
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(search);
  const [searchPromptIndex, setSearchPromptIndex] = useState(0);
  const [shouldAnimateSearchCricket, setShouldAnimateSearchCricket] =
    useState<boolean>(() => {
      if (
        typeof window === "undefined" ||
        typeof window.matchMedia !== "function"
      ) {
        return true;
      }

      return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    });
  const [hasChosenGuestMode, setHasChosenGuestMode] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.sessionStorage.getItem(GUEST_ENTRY_SESSION_KEY) === "1";
  });
  const [isGuestEntryOpen, setIsGuestEntryOpen] = useState(false);
  const [shouldLoadCategories, setShouldLoadCategories] = useState(false);
  const [shouldLoadCategoryMoreMenu, setShouldLoadCategoryMoreMenu] =
    useState(false);
  const [shouldLoadMobileFilters, setShouldLoadMobileFilters] = useState(false);
  const [isFeedReady, setIsFeedReady] = useState(false);
  const [activeDiscoveryPreset, setActiveDiscoveryPreset] = useState<
    "liked" | null
  >(null);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return false;
    }
    return window.matchMedia("(max-width: 767px)").matches;
  });
  const desktopSearchBallRef = useRef<HTMLSpanElement | null>(null);
  const desktopSearchWicketRef = useRef<HTMLSpanElement | null>(null);
  const mobileSearchBallRef = useRef<HTMLSpanElement | null>(null);
  const mobileSearchWicketRef = useRef<HTMLSpanElement | null>(null);
  const searchHasTextRef = useRef(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { data: categories } = useCategories({ enabled: shouldLoadCategories });
  const {
    data: homePublicBootstrap,
    isLoading: isHomeBootstrapLoading,
    refetch: refetchHomeBootstrap,
  } = useHomeBootstrap({
    category,
    store,
    minDiscount,
    search,
    sortBy,
    region,
  });
  const { data: homeUserSummary } = useHomeUserSummary({
    enabled: isAuthenticated,
    userId: user?.id ?? null,
  });
  const unreadNotificationCount =
    homeUserSummary?.unreadNotificationCount ?? 0;
  const savedSignals = homeUserSummary?.savedSignals ?? [];
  const shouldHoldDealsQueryForBootstrap =
    isHomeBootstrapLoading && !homePublicBootstrap;
  const homeBootstrapFeedInitialData = homePublicBootstrap
    ? {
        pages: [homePublicBootstrap.feed],
        pageParams: [1],
      }
    : undefined;

  // Keep local input state aligned when search is reset externally (nav/pig/home buttons).
  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  useEffect(() => runWhenIdle(() => setShouldLoadCategories(true), 700), []);
  useEffect(() => runWhenIdle(() => setIsFeedReady(true), 250), []);
  useEffect(
    () =>
      runWhenIdle(
        () => setShouldLoadCategoryMoreMenu(true),
        DEFERRED_CATEGORY_MENU_MS,
      ),
    [],
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };

    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || searchValue.trim().length > 0) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setSearchPromptIndex((current) => (current + 1) % SEARCH_PROMPTS.length);
    }, SEARCH_PROMPT_CYCLE_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [searchValue, searchPromptIndex]);

  useEffect(() => {
    searchHasTextRef.current = searchValue.trim().length > 0;
  }, [searchValue]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = (event?: MediaQueryListEvent | MediaQueryList) => {
      setShouldAnimateSearchCricket(!(event?.matches ?? mediaQuery.matches));
    };

    updatePreference(mediaQuery);
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      region !== "INDIA" ||
      !shouldAnimateSearchCricket
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
  }, [region, shouldAnimateSearchCricket]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (isAuthenticated || hasChosenGuestMode) {
      setIsGuestEntryOpen(false);
      return;
    }

    setIsGuestEntryOpen(true);
  }, [hasChosenGuestMode, isAuthenticated, isAuthLoading]);

  useEffect(() => {
    if (!isMobileViewport) {
      setShouldLoadMobileFilters(false);
      return;
    }

    return runWhenIdle(
      () => setShouldLoadMobileFilters(true),
      DEFERRED_MOBILE_FILTERS_MS,
    );
  }, [isMobileViewport]);

  // Read category from URL params on mount
  useEffect(() => {
    const urlCategory = searchParams.get("category");
    if (urlCategory && urlCategory !== category) {
      setCategory(urlCategory);
      // Clear the URL param after setting
      searchParams.delete("category");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, setCategory, category]);

  // Mobile chrome behavior:
  // - hide the sticky top bar only when the user scrolls deeper into the feed
  // - reveal it when they reverse direction and scroll upward
  // - soften bottom-edge chrome only while active scrolling is in progress
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

  const {
    data,
    isLoading: isDealsLoading,
    isError: isDealsError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchDeals,
  } = useDeals({
    category,
    store,
    minDiscount,
    search,
    sortBy,
    region,
    retainAllPages: true,
    enabled: !shouldHoldDealsQueryForBootstrap,
    initialData: homeBootstrapFeedInitialData,
  });
  const isLoading = shouldHoldDealsQueryForBootstrap || isDealsLoading;
  const isError = isDealsError;
  const refetch = async () => {
    await Promise.all([refetchHomeBootstrap(), refetchDeals()]);
  };
  const hasNextPageRef = useRef(Boolean(hasNextPage));
  const isFetchingNextPageRef = useRef(isFetchingNextPage);
  const loadMoreTriggeredRef = useRef(false);

  useEffect(() => {
    hasNextPageRef.current = Boolean(hasNextPage);
  }, [hasNextPage]);

  useEffect(() => {
    isFetchingNextPageRef.current = isFetchingNextPage;
  }, [isFetchingNextPage]);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }

        if (!entry.isIntersecting) {
          loadMoreTriggeredRef.current = false;
          return;
        }

        if (
          loadMoreTriggeredRef.current ||
          isFetchingNextPageRef.current ||
          !hasNextPageRef.current
        ) {
          return;
        }

        loadMoreTriggeredRef.current = true;
        fetchNextPage();
      },
      {
        rootMargin: "200px 0px",
        threshold: 0,
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage]);

  // Flatten paginated data
  const deals = useMemo(() => {
    return dedupeDeals(data?.pages.flatMap((page) => page.data) ?? []);
  }, [data]);

  const savedDealIds = useMemo(() => {
    return new Set(savedSignals.map((deal) => deal.id));
  }, [savedSignals]);

  const likedSeedDeals = useMemo(() => {
    const seeds = new Map<string, RecommendationSeed>();

    savedSignals.forEach((deal) => {
      if (deal.region === region) {
        seeds.set(deal.id, deal);
      }
    });

    deals.forEach((deal) => {
      if (
        deal.region === region &&
        (deal.userSaved || deal.userUpvote === 1 || savedDealIds.has(deal.id))
      ) {
        seeds.set(deal.id, deal);
      }
    });

    return Array.from(seeds.values());
  }, [savedSignals, deals, region, savedDealIds]);

  const recommendationSignals = useMemo(() => {
    const categoryWeights = new Map<string, number>();
    const storeWeights = new Map<string, number>();
    const brandWeights = new Map<string, number>();
    const titleTokenWeights = new Map<string, number>();

    likedSeedDeals.forEach((deal) => {
      const signalWeight =
        savedDealIds.has(deal.id) || deal.userSaved ? 2.2 : 1.5;
      const categoryKey = deal.category?.slug;
      const storeKey = normalizePreferenceValue(deal.store);
      const brandKey = normalizePreferenceValue(deal.brand);

      if (categoryKey) {
        categoryWeights.set(
          categoryKey,
          (categoryWeights.get(categoryKey) ?? 0) + signalWeight,
        );
      }

      if (storeKey) {
        storeWeights.set(
          storeKey,
          (storeWeights.get(storeKey) ?? 0) + signalWeight,
        );
      }

      if (brandKey) {
        brandWeights.set(
          brandKey,
          (brandWeights.get(brandKey) ?? 0) + signalWeight,
        );
      }

      tokenizeRecommendationText(
        deal.cleanTitle,
        deal.title,
        deal.brand,
        deal.store,
      ).forEach((token) => {
        titleTokenWeights.set(
          token,
          (titleTokenWeights.get(token) ?? 0) + signalWeight,
        );
      });
    });

    return {
      categoryWeights,
      storeWeights,
      brandWeights,
      titleTokenWeights,
    };
  }, [likedSeedDeals, savedDealIds]);

  const hasLikedSignals = isAuthenticated && likedSeedDeals.length > 0;

  const displayDeals = useMemo(() => {
    if (activeDiscoveryPreset !== "liked" || !hasLikedSignals) {
      return deals;
    }

    const likedDealIds = new Set(likedSeedDeals.map((deal) => deal.id));

    const scoredDeals = deals.map((deal, index) => {
      if (likedDealIds.has(deal.id)) {
        return { deal, index, score: -1 };
      }

      let score = 0;
      const categoryKey = deal.category?.slug;
      const storeKey = normalizePreferenceValue(deal.store);
      const brandKey = normalizePreferenceValue(deal.brand);

      if (categoryKey) {
        score +=
          (recommendationSignals.categoryWeights.get(categoryKey) ?? 0) * 8;
      }

      if (storeKey) {
        score += (recommendationSignals.storeWeights.get(storeKey) ?? 0) * 10;
      }

      if (brandKey) {
        score += (recommendationSignals.brandWeights.get(brandKey) ?? 0) * 7;
      }

      const titleTokenScore = tokenizeRecommendationText(
        deal.cleanTitle,
        deal.title,
        deal.brand,
      ).reduce((total, token) => {
        return (
          total + (recommendationSignals.titleTokenWeights.get(token) ?? 0)
        );
      }, 0);

      score += Math.min(titleTokenScore * 1.45, 18);
      score += Math.min((deal.discountPercent ?? 0) / 12, 6);
      score += deal.imageUrl ? 0.75 : 0;

      const ageInHours =
        (Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60);
      score += Math.max(0, 3 - ageInHours / 24);

      return { deal, index, score };
    });

    const recommended = scoredDeals
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.index - b.index;
      })
      .map(({ deal }) => deal);

    const remaining = scoredDeals
      .filter(({ score }) => score <= 0)
      .sort((a, b) => a.index - b.index)
      .map(({ deal }) => deal);

    return recommended.concat(remaining);
  }, [
    activeDiscoveryPreset,
    deals,
    hasLikedSignals,
    likedSeedDeals,
    recommendationSignals,
  ]);

  useEffect(() => {
    if (activeDiscoveryPreset === "liked" && !hasLikedSignals) {
      setActiveDiscoveryPreset(null);
    }
  }, [activeDiscoveryPreset, hasLikedSignals]);

  useEffect(() => {
    const normalizedInput = searchValue.trim();
    const normalizedActiveSearch = search.trim();

    if (normalizedInput === normalizedActiveSearch) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSearch(normalizedInput);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchValue, search, setSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchValue.trim());

    // On mobile browsers (notably iOS Safari), blur active input after submit
    // to avoid lingering keyboard/zoom state.
    if (window.matchMedia("(max-width: 767px)").matches) {
      const active = document.activeElement;
      if (active instanceof HTMLElement) {
        active.blur();
      }
    }
  };

  const handleSearchInputChange = (value: string) => {
    setSearchValue(value);

    // If an active search is cleared, reset immediately without requiring Enter.
    if (value.trim() === "" && search.trim() !== "") {
      setSearch("");
    }
  };

  const clearSearchInput = () => {
    handleSearchInputChange("");
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const resetToHomeDefault = () => {
    setActiveDiscoveryPreset(null);
    setSearchValue("");
    resetFilters();
    setSearchParams({}, { replace: true });
  };

  const categoriesList: Category[] = categories ?? [];
  const currentRegionMeta = getRegionMeta(region);
  const nextRegionMeta = getRegionMeta(getNextRegion(region));
  const activeSearchPrompt = SEARCH_PROMPTS[searchPromptIndex];
  const shouldShowSearchCricketPass =
    region === "INDIA" && shouldAnimateSearchCricket;
  const shouldShowSearchWicket =
    region === "INDIA" &&
    shouldAnimateSearchCricket &&
    !searchValue.trim().length;
  const shouldShowMyntraCarousel = region === "INDIA";
  const prefetchedAmazonDeals = homePublicBootstrap?.amazonDeals;
  const prefetchedMyntraDeals = homePublicBootstrap?.myntraDeals;
  const isBecauseYouLikedThis = activeDiscoveryPreset === "liked";
  const isTodayPicks =
    !isBecauseYouLikedThis && sortBy === "newest" && !minDiscount;
  const isTrendingStores = !isBecauseYouLikedThis && sortBy === "popular";
  const isBigDrops =
    !isBecauseYouLikedThis &&
    !isTrendingStores &&
    (sortBy === "discount" || (minDiscount ?? 0) >= 50);

  const applyDiscoveryPreset = (
    preset: "today" | "trending" | "drops" | "liked",
  ) => {
    if (preset === "liked") {
      if (!hasLikedSignals) {
        return;
      }

      setActiveDiscoveryPreset("liked");
      setSortBy("newest");
      setMinDiscount(null);
      return;
    }

    setActiveDiscoveryPreset(null);

    if (preset === "today") {
      setSortBy("newest");
      setMinDiscount(null);
      return;
    }
    if (preset === "trending") {
      setSortBy("popular");
      setMinDiscount(null);
      return;
    }
    setSortBy("discount");
    setMinDiscount(50);
  };

  const triggerCategoryMoreMenuLoad = () => {
    if (!shouldLoadCategoryMoreMenu) {
      setShouldLoadCategoryMoreMenu(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <GuestEntryDialog
        open={isGuestEntryOpen}
        onBrowseGuest={() => {
          window.sessionStorage.setItem(GUEST_ENTRY_SESSION_KEY, "1");
          setHasChosenGuestMode(true);
          setIsGuestEntryOpen(false);
        }}
        onLogin={handleGoogleLogin}
      />

      {/* Filter Dialog */}
      {filterOpen ? (
        <Suspense fallback={null}>
          <FilterDialog open={filterOpen} onOpenChange={setFilterOpen} />
        </Suspense>
      ) : null}

      {/* Main Content */}
      <div>
        {/* Minimal Top Bar */}
        <header
          className={cn(
            "motion-home-topbar sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:translate-y-0 md:opacity-100 md:pointer-events-auto md:transition-none",
            isHomeTopBarHidden
              ? "pointer-events-none -translate-y-[calc(100%+0.5rem)] opacity-0 shadow-none"
              : "translate-y-0 opacity-100 shadow-none",
          )}
        >
          <div className="flex h-[3.2rem] items-center justify-between px-2.5 sm:px-3 md:h-20 md:px-8">
            {/* Mobile Logo */}
            <Link
              to="/"
              className="flex items-center gap-1.5 md:hidden"
              onClick={resetToHomeDefault}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center">
                <SaveKaroMark className="h-[1.375rem] w-[1.375rem] drop-shadow-sm" />
              </span>
              <span className="text-[14px] font-bold tracking-[-0.02em] sm:text-[15px]">
                SaveKaro
              </span>
            </Link>

            {/* Search Bar */}
            <form
              onSubmit={handleSearch}
              className="hidden md:flex flex-1 max-w-3xl mx-auto"
            >
              <div className="relative w-full">
                {shouldShowSearchCricketPass ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 z-[2] block h-0 overflow-visible [contain:layout_style]"
                  >
                    <span
                      ref={desktopSearchBallRef}
                      className="absolute right-0 top-0 block opacity-0 will-change-[transform,opacity]"
                    >
                      <CricketBallIcon className="h-[0.95rem] w-[0.95rem] drop-shadow-[0_10px_18px_rgba(181,32,29,0.26)]" />
                    </span>
                  </span>
                ) : null}
                <Input
                  type="search"
                  placeholder="Search deals..."
                  aria-label="Search deals"
                  className="peer h-14 rounded-full border-0 bg-secondary pl-14 pr-14 text-lg placeholder:text-transparent focus-visible:ring-2"
                  value={searchValue}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                />
                <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                {!searchValue.trim() ? (
                  <SearchPromptOverlay
                    prompt={activeSearchPrompt}
                    promptKey={searchPromptIndex}
                    className="left-14 right-14"
                    textClassName="text-[1.02rem]"
                  />
                ) : null}
                {shouldShowSearchWicket ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-5 top-1/2 z-[1] flex h-9 w-[1.35rem] -translate-y-1/2 items-end justify-center overflow-visible"
                  >
                    <span
                      ref={desktopSearchWicketRef}
                      className="flex h-full w-full items-center justify-center will-change-transform"
                    >
                      <SearchWicketIcon className="h-[1.28rem] w-[1.28rem]" />
                    </span>
                  </span>
                ) : null}
                {searchValue ? (
                  <button
                    type="button"
                    onClick={clearSearchInput}
                    title="Clear search"
                    aria-label="Clear search"
                    className="absolute right-4 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-[color,background-color,transform] duration-200 hover:bg-background hover:text-foreground active:scale-95"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                ) : null}
              </div>
            </form>

            {/* User Actions */}
            <div className="flex shrink-0 items-center gap-px sm:gap-1.5">
              <DemoVideoDialog className="h-8 gap-1 px-2 text-xs sm:h-10 sm:gap-1.5 sm:px-3 sm:text-sm" />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFilterOpen(true)}
                title="Platform"
                aria-label="Platform"
                className="h-8 w-8 p-0 sm:h-10 sm:w-10"
              >
                <span className="flex h-full w-full items-center justify-center">
                  <Store className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
                </span>
              </Button>

              <Button
                asChild
                variant="ghost"
                size="icon"
                className="inline-flex h-8 w-8 p-0 md:h-10 md:w-10"
              >
                <Link
                  to="/affiliate-disclosure"
                  title="Affiliate Disclosure"
                  aria-label="Open affiliate disclosure page"
                >
                  <span className="flex h-full w-full items-center justify-center">
                    <BadgeInfo className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
                  </span>
                </Link>
              </Button>

              {/* Notifications */}
              {isAuthenticated && (
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="group/bell relative h-8 w-8 p-0 sm:h-10 sm:w-10"
                >
                  <Link
                    to="/notifications"
                    title="Notifications"
                    aria-label={
                      unreadNotificationCount > 0
                        ? `Open notifications page. ${unreadNotificationCount} unread notification${unreadNotificationCount === 1 ? "" : "s"}`
                        : "Open notifications page"
                    }
                  >
                    <span className="flex h-full w-full items-center justify-center">
                      <Bell className="motion-bell-jingle h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
                    </span>
                    {unreadNotificationCount > 0 ? (
                      <span className="pointer-events-none absolute -right-1 -top-1 inline-flex min-h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full border border-white/90 bg-[linear-gradient(180deg,#ff5f6d,#ef4444)] px-1 text-[10px] font-semibold leading-none text-white shadow-[0_14px_24px_-16px_rgba(239,68,68,0.95)] sm:min-h-[1.25rem] sm:min-w-[1.25rem] sm:text-[11px]">
                        {unreadNotificationCount > 99
                          ? "99+"
                          : unreadNotificationCount}
                      </span>
                    ) : null}
                  </Link>
                </Button>
              )}

              {/* Region Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleRegion}
                title={`Showing ${currentRegionMeta.label} deals. Click for ${nextRegionMeta.label}`}
                aria-label={`Switch to ${nextRegionMeta.label} deals`}
                className="h-8 w-8 p-0 sm:h-10 sm:w-10"
              >
                <span className="flex h-full w-full items-center justify-center">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full text-[16px] leading-none sm:h-6 sm:w-6 sm:text-[18px]">
                    {currentRegionMeta.icon}
                  </span>
                </span>
              </Button>
              {isAuthenticated ? (
                <Suspense
                  fallback={
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full p-0 sm:h-10 sm:w-10"
                    >
                      <div className="h-8 w-8 rounded-full bg-secondary sm:h-10 sm:w-10" />
                    </Button>
                  }
                >
                  <AuthUserMenu user={user} onLogout={logout} />
                </Suspense>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleGoogleLogin}
                  title="Sign in with Google"
                  aria-label="Sign in with Google"
                  className="h-8 w-8 p-0 sm:h-10 sm:w-10"
                >
                  <span className="flex h-full w-full items-center justify-center">
                    <LogIn className="h-4 w-4 sm:h-[1.05rem] sm:w-[1.05rem]" />
                  </span>
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Search Bar */}
          <div className="px-3 pb-1.5 md:hidden">
            <form onSubmit={handleSearch} className="relative overflow-visible">
              {shouldShowSearchCricketPass ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 z-[2] block h-0 overflow-visible [contain:layout_style]"
                >
                  <span
                    ref={mobileSearchBallRef}
                    className="absolute right-0 top-0 block opacity-0 will-change-[transform,opacity]"
                  >
                    <CricketBallIcon className="h-[1rem] w-[1rem]" />
                  </span>
                </span>
              ) : null}
              <Input
                type="search"
                placeholder="Search deals..."
                aria-label="Search deals"
                className="peer h-[2.15rem] w-full rounded-full border-0 bg-secondary pl-8 pr-10 text-base placeholder:text-transparent"
                value={searchValue}
                onChange={(e) => handleSearchInputChange(e.target.value)}
              />
              {shouldShowSearchWicket ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-[0.5rem] top-1/2 z-[1] flex h-8 w-[1.35rem] -translate-y-1/2 items-end justify-center overflow-visible"
                >
                  <span
                    ref={mobileSearchWicketRef}
                    className="flex h-full w-full items-center justify-center will-change-transform"
                  >
                    <SearchWicketIcon className="h-[1.24rem] w-[1.24rem]" />
                  </span>
                </span>
              ) : null}
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              {!searchValue.trim() ? (
                <SearchPromptOverlay
                  prompt={activeSearchPrompt}
                  promptKey={searchPromptIndex}
                  className="left-8 right-10"
                  textClassName="text-[0.95rem]"
                />
              ) : null}
              {searchValue ? (
                <button
                  type="button"
                  onClick={clearSearchInput}
                  title="Clear search"
                  aria-label="Clear search"
                  className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-[color,background-color,transform] duration-200 hover:bg-background hover:text-foreground active:scale-95"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </form>
          </div>

          {/* Discovery Strip */}
          <div className="border-t border-border/60 bg-gradient-to-r from-amber-50/45 via-background to-rose-50/40 px-3 py-1.5 md:px-8 md:py-2">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <span
                className="motion-discover-label shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90 md:text-[11px]"
                style={{ animationDelay: "20ms" }}
              >
                Discover
              </span>

              <button
                onClick={() => applyDiscoveryPreset("today")}
                className={cn(
                  "motion-pill-enter shrink-0 inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-[transform,box-shadow,background-color,border-color,color] duration-200 will-change-transform hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] md:min-h-9 md:py-1.5 md:text-xs",
                  isTodayPicks
                    ? "motion-pill-active bg-amber-200/30 border-amber-300/60 text-foreground shadow-[0_14px_22px_-20px_rgba(245,158,11,0.85)]"
                    : "bg-background/70 border-border text-muted-foreground hover:border-border/80 hover:bg-background/90 hover:text-foreground",
                )}
                style={{ animationDelay: "70ms" }}
                aria-label="Show today's picks"
                title="Today's picks"
              >
                <PicksIcon className="h-3.5 w-3.5" />
                Today's picks
              </button>

              <button
                onClick={() => applyDiscoveryPreset("trending")}
                className={cn(
                  "motion-pill-enter shrink-0 inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-[transform,box-shadow,background-color,border-color,color] duration-200 will-change-transform hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] md:min-h-9 md:py-1.5 md:text-xs",
                  isTrendingStores
                    ? "motion-pill-active bg-sky-200/30 border-sky-300/60 text-foreground shadow-[0_14px_22px_-20px_rgba(14,165,233,0.78)]"
                    : "bg-background/70 border-border text-muted-foreground hover:border-border/80 hover:bg-background/90 hover:text-foreground",
                )}
                style={{ animationDelay: "120ms" }}
                aria-label="Show trending stores deals"
                title="Trending stores"
              >
                <TrendIcon className="h-3.5 w-3.5" />
                Trending stores
              </button>

              <button
                onClick={() => applyDiscoveryPreset("drops")}
                className={cn(
                  "motion-pill-enter shrink-0 inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-[transform,box-shadow,background-color,border-color,color] duration-200 will-change-transform hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] md:min-h-9 md:py-1.5 md:text-xs",
                  isBigDrops
                    ? "motion-pill-active bg-emerald-200/35 border-emerald-300/60 text-foreground shadow-[0_14px_22px_-20px_rgba(16,185,129,0.8)]"
                    : "bg-background/70 border-border text-muted-foreground hover:border-border/80 hover:bg-background/90 hover:text-foreground",
                )}
                style={{ animationDelay: "170ms" }}
                aria-label="Show big drops"
                title="Big drops"
              >
                <DropsIcon className="h-3.5 w-3.5" />
                Big drops
              </button>

              <button
                onClick={() => applyDiscoveryPreset("liked")}
                disabled={!hasLikedSignals}
                className={cn(
                  "motion-pill-enter shrink-0 inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-[transform,box-shadow,background-color,border-color,color] duration-200 will-change-transform hover:-translate-y-[1px] active:translate-y-0 active:scale-[0.98] md:min-h-9 md:py-1.5 md:text-xs",
                  isBecauseYouLikedThis
                    ? "motion-pill-active bg-rose-200/35 border-rose-300/70 text-foreground shadow-[0_14px_22px_-20px_rgba(244,114,182,0.82)]"
                    : "bg-background/70 border-border text-muted-foreground hover:border-border/80 hover:bg-background/90 hover:text-foreground",
                  !hasLikedSignals &&
                    "cursor-not-allowed opacity-60 hover:text-muted-foreground",
                )}
                style={{ animationDelay: "220ms" }}
                aria-label="Show recommendations based on deals you liked"
                title={
                  hasLikedSignals
                    ? "Because you liked this"
                    : "Save or upvote deals to unlock recommendations"
                }
              >
                <Heart className="h-3.5 w-3.5" />
                Because you liked this
              </button>
            </div>
          </div>

          {/* Category Navigation Bar */}
          <div className="border-b border-border/60 bg-gradient-to-r from-background via-secondary/35 to-background px-3 py-1 md:px-8 md:py-3">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setCategory(null)}
                className={`shrink-0 inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium whitespace-nowrap transition-colors duration-200 ease-out md:min-h-9 md:px-3.5 md:py-1.5 md:text-sm ${
                  category === null
                    ? "text-foreground border-slate-400/40 bg-slate-400/15"
                    : "text-muted-foreground border-slate-300/40 bg-slate-300/10 hover:text-foreground"
                }`}
              >
                All
              </button>
              {categories?.slice(0, 6).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.slug)}
                  className={`hidden md:inline-flex shrink-0 min-h-9 items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap transition-colors duration-200 ease-out ${
                    category === cat.slug
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={getCategoryPillStyle(cat.color, category === cat.slug)}
                >
                  <span
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] leading-none"
                    style={getCategoryIconStyle(
                      cat.color,
                      category === cat.slug,
                    )}
                  >
                    {getCategoryIcon(cat)}
                  </span>
                  {cat.name}
                </button>
              ))}

              {/* More Categories Menu */}
              {shouldLoadCategoryMoreMenu ? (
                <Suspense
                  fallback={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1.5 rounded-full px-3 text-[13px] md:h-9 md:text-sm"
                    >
                      <span className="hidden sm:inline">More</span>
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 6h16M4 12h16M4 18h16"
                        />
                      </svg>
                    </Button>
                  }
                >
                  <CategoryMoreMenu
                    categories={categoriesList}
                    selectedCategory={category}
                    onSelectCategory={setCategory}
                  />
                </Suspense>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 rounded-full px-3 text-[13px] md:h-9 md:text-sm"
                  onClick={triggerCategoryMoreMenuLoad}
                  onMouseEnter={triggerCategoryMoreMenuLoad}
                  onFocus={triggerCategoryMoreMenuLoad}
                  onTouchStart={triggerCategoryMoreMenuLoad}
                  aria-label="Load more categories"
                  title="More categories"
                >
                  <span className="hidden sm:inline">More</span>
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </Button>
              )}

              {isMobileViewport ? (
                <>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 shrink-0 rounded-full border border-slate-300/40 bg-slate-300/10 p-0 text-muted-foreground"
                  >
                    <Link to="/guides" aria-label="Open guides" title="Guides">
                      <BookOpen className="h-4 w-4" />
                      <span className="sr-only">Guides</span>
                    </Link>
                  </Button>

                  {shouldLoadMobileFilters ? (
                    <Suspense
                      fallback={
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 shrink-0 rounded-full border border-slate-300/40 bg-slate-300/10 p-0 text-muted-foreground"
                          aria-label="Load filters"
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                          <span className="sr-only">Filters</span>
                        </Button>
                      }
                    >
                      <MobileFilters compact />
                    </Suspense>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 shrink-0 rounded-full border border-slate-300/40 bg-slate-300/10 p-0 text-muted-foreground"
                      onClick={() => setShouldLoadMobileFilters(true)}
                      onMouseEnter={() => setShouldLoadMobileFilters(true)}
                      onFocus={() => setShouldLoadMobileFilters(true)}
                      onTouchStart={() => setShouldLoadMobileFilters(true)}
                      aria-label="Load filters"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      <span className="sr-only">Filters</span>
                    </Button>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <main className="px-4 md:px-6 py-4 pb-24 md:pb-8">
          {/* Error State */}
          {isError && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-7xl mb-6">😕</div>
              <h3 className="text-2xl font-semibold mb-3">
                Something went wrong
              </h3>
              <p className="text-muted-foreground mb-6">
                {error instanceof Error
                  ? error.message
                  : "Failed to load deals"}
              </p>
              <Button onClick={() => refetch()} className="rounded-full">
                Try Again
              </Button>
            </div>
          )}

          {/* Deal Grid */}
          {!isError && (
            <>
              <div className="lg:hidden">
                <HomeWalkthroughInline />
              </div>

              {shouldShowMyntraCarousel ? (
                <div className="mb-6 hidden lg:grid lg:grid-cols-[minmax(0,1.18fr)_360px] lg:items-stretch lg:gap-4 xl:grid-cols-[minmax(0,1.16fr)_380px] min-[1700px]:mb-12 min-[1700px]:grid-cols-[minmax(0,1.08fr)_430px] min-[1700px]:gap-5">
                  <HomeWalkthroughInline
                    unbounded
                    className="mb-0 min-[1700px]:justify-self-center min-[1700px]:max-w-[1240px]"
                  />
                  <MyntraHeroCarousel
                    region={region}
                    deals={prefetchedMyntraDeals}
                    queryEnabled={!shouldHoldDealsQueryForBootstrap}
                    loading={shouldHoldDealsQueryForBootstrap}
                  />
                </div>
              ) : (
                <div className="hidden lg:block">
                  <HomeWalkthroughInline className="mb-6" />
                </div>
              )}

              <AmazonDealsSplitCarousel
                region={region}
                deals={prefetchedAmazonDeals}
                queryEnabled={!shouldHoldDealsQueryForBootstrap}
                loading={shouldHoldDealsQueryForBootstrap}
              />
              {shouldShowMyntraCarousel ? (
                <MyntraHeroCarousel
                  region={region}
                  variant="mobile"
                  deals={prefetchedMyntraDeals}
                  queryEnabled={!shouldHoldDealsQueryForBootstrap}
                  loading={shouldHoldDealsQueryForBootstrap}
                />
              ) : null}
              <FeaturedDealsCarousel
                deals={deals}
                isLoading={isLoading}
                isImagePriorityPrimary={false}
              />
              <CouponDealsCarousel deals={deals} isLoading={isLoading} />

              {isFeedReady ? (
                <Suspense fallback={<DealGridFallback />}>
                  <DealGrid
                    deals={displayDeals}
                    isLoading={isLoading}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                  />
                </Suspense>
              ) : (
                <DealGridFallback />
              )}

              {/* Load More Trigger */}
              {hasNextPage && (
                <div ref={loadMoreRef} className="flex justify-center py-8">
                  {isFetchingNextPage && (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  )}
                </div>
              )}

              {/* End of Results */}
              {!hasNextPage && deals.length > 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  You've seen all the deals! 🎉
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Home;
