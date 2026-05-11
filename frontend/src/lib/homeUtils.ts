import type { CSSProperties } from "react";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
export const SEARCH_DEBOUNCE_MS = 300;
export const SCROLL_STOP_RESTORE_MS = 140;
export const IDLE_TASK_TIMEOUT_MS = 500;
export const DEFERRED_CATEGORY_MENU_MS = 1400;
export const DEFERRED_MOBILE_FILTERS_MS = 1200;
export const MOBILE_TOP_BAR_RESET_PX = 12;
export const MOBILE_TOP_BAR_HIDE_THRESHOLD_PX = 28;
export const MOBILE_TOP_BAR_SHOW_THRESHOLD_PX = 16;
export const SEARCH_CRICKET_LOOP_MS = 6000;
export const SEARCH_CRICKET_PASS_MS = 2500;
export const SEARCH_PROMPT_CYCLE_MS = 2800;
export const SEARCH_PROMPTS = [
  "Search for electronics",
  "Search for fashion",
  "Search for food",
  "Search for gaming",
  "Search for beauty",
  "Search for travel",
] as const;

export const DEFAULT_CATEGORY_TINT = "#64748b";
export const GUEST_ENTRY_SESSION_KEY = "savekaro_guest_entry_dismissed";

export const RECOMMENDATION_STOP_WORDS = new Set([
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

export type IdleCapableWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export const runWhenIdle = (callback: () => void, timeout = IDLE_TASK_TIMEOUT_MS) => {
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

export function normalizeHexColor(value: string | null | undefined): string {
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

export function hexToRgb(hex: string): [number, number, number] {
  const normalized = normalizeHexColor(hex);
  return [
    Number.parseInt(normalized.slice(1, 3), 16),
    Number.parseInt(normalized.slice(3, 5), 16),
    Number.parseInt(normalized.slice(5, 7), 16),
  ];
}

export function getCategoryPillStyle(
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

export function getCategoryIconStyle(
  color: string | null | undefined,
  active: boolean,
): CSSProperties {
  const [r, g, b] = hexToRgb(color ?? DEFAULT_CATEGORY_TINT);
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${active ? 0.26 : 0.14})`,
  };
}

export function normalizePreferenceValue(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function tokenizeRecommendationText(
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
