import type { PostHog } from "posthog-js";

const POSTHOG_TOKEN = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN?.trim();
const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
const POSTHOG_UI_HOST =
  import.meta.env.VITE_POSTHOG_UI_HOST?.trim() || "https://us.posthog.com";
const API_URL = import.meta.env.VITE_API_URL?.trim() || window.location.origin;
const CONSENT_STORAGE_KEY = "savekaro-analytics-consent";

const isExplicitlyEnabled =
  import.meta.env.VITE_POSTHOG_ENABLED?.toLowerCase() === "true";
const consentRequired =
  import.meta.env.VITE_POSTHOG_REQUIRE_CONSENT?.toLowerCase() !== "false";
const replayEnabled =
  import.meta.env.VITE_POSTHOG_SESSION_REPLAY_ENABLED?.toLowerCase() ===
  "true";
const legacyUmamiEnabled =
  import.meta.env.VITE_UMAMI_ENABLED?.toLowerCase() !== "false";
const UMAMI_SCRIPT_URL =
  import.meta.env.VITE_UMAMI_SCRIPT_URL?.trim() ||
  "https://umami.cooldash.xyz/script.js";
const UMAMI_WEBSITE_ID =
  import.meta.env.VITE_UMAMI_WEBSITE_ID?.trim() ||
  "d74b89a0-1e26-40bd-b27a-25b04103a8e3";

export const isAnalyticsConfigured = Boolean(
  isExplicitlyEnabled && POSTHOG_TOKEN,
);
export const isAnalyticsConsentRequired = consentRequired;

export type AnalyticsConsent = "granted" | "denied" | "pending";

let initialized = false;
let posthogClient: PostHog | null = null;
let posthogPromise: Promise<PostHog | null> | null = null;

function readLegacyPostHogConsent(): AnalyticsConsent {
  if (!POSTHOG_TOKEN) return "pending";
  const key = `__ph_opt_in_out_${POSTHOG_TOKEN}`;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) {
      const value: unknown = JSON.parse(raw);
      if (value === 1 || value === true || value === "1") return "granted";
      if (value === 0 || value === false || value === "0") return "denied";
    }
  } catch {
    // Fall through to the legacy cookie format.
  }

  try {
    const cookie = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${key}=`))
      ?.split("=")
      .slice(1)
      .join("=");
    if (cookie) {
      const value: unknown = JSON.parse(decodeURIComponent(cookie));
      if (value === 1 || value === true || value === "1") return "granted";
      if (value === 0 || value === false || value === "0") return "denied";
    }
  } catch {
    // Missing or malformed legacy consent means no explicit choice was made.
  }
  return "pending";
}

function readStoredConsent(): AnalyticsConsent {
  if (!consentRequired) return "granted";
  try {
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored === "granted" || stored === "denied") return stored;
  } catch {
    // Continue with the legacy PostHog consent key.
  }

  const legacyConsent = readLegacyPostHogConsent();
  if (legacyConsent !== "pending") storeConsent(legacyConsent);
  return legacyConsent;
}

function storeConsent(consent: Exclude<AnalyticsConsent, "pending">) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, consent);
  } catch {
    // Analytics must never interfere with product functionality.
  }
}

function enableLegacyUmami() {
  if (!legacyUmamiEnabled || !UMAMI_WEBSITE_ID) return;

  try {
    window.localStorage.removeItem("umami.disabled");
  } catch {
    // Analytics must never interfere with product functionality.
  }
  if (document.getElementById("savekaro-umami")) return;

  const load = () => {
    if (document.getElementById("savekaro-umami")) return;
    const script = document.createElement("script");
    script.id = "savekaro-umami";
    script.src = UMAMI_SCRIPT_URL;
    script.defer = true;
    script.async = true;
    script.setAttribute("data-website-id", UMAMI_WEBSITE_ID);
    script.setAttribute("data-exclude-search", "true");
    script.setAttribute("data-exclude-hash", "true");
    script.setAttribute("data-do-not-track", "true");
    document.head.appendChild(script);
  };

  window.setTimeout(load, 1_200);
}

function disableLegacyUmami() {
  try {
    window.localStorage.setItem("umami.disabled", "1");
  } catch {
    // Analytics must never interfere with product functionality.
  }
}

function sanitizeUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length === 0) return undefined;

  try {
    const url = new URL(value, window.location.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
}

function getApiHostname(): string[] {
  try {
    return [new URL(API_URL, window.location.origin).hostname];
  } catch {
    return [];
  }
}

export function getRouteName(pathname: string): string {
  if (/^\/deal\/[^/]+$/.test(pathname)) return "/deal/:id";
  if (pathname.startsWith("/auth/")) return "/auth/:action";
  return pathname || "/";
}

async function loadAnalyticsClient(): Promise<PostHog | null> {
  if (
    !initialized ||
    !isAnalyticsConfigured ||
    !POSTHOG_TOKEN ||
    readStoredConsent() !== "granted"
  ) {
    return null;
  }
  if (posthogClient) return posthogClient;
  if (posthogPromise) return posthogPromise;

  posthogPromise = import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(POSTHOG_TOKEN, {
        api_host: POSTHOG_HOST,
        ui_host: POSTHOG_UI_HOST,
        defaults: "2026-05-30",
        capture_pageview: "history_change",
        capture_pageleave: true,
        autocapture: {
          dom_event_allowlist: ["click"],
          element_allowlist: ["a", "button"],
        },
        capture_exceptions: false,
        capture_performance: true,
        disable_session_recording: !replayEnabled,
        enable_recording_console_log: false,
        opt_out_capturing_by_default: consentRequired,
        opt_out_persistence_by_default: consentRequired,
        respect_dnt: true,
        secure_cookie: window.location.protocol === "https:",
        tracing_headers: getApiHostname(),
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: ".ph-mask, [data-private]",
          blockSelector: ".ph-no-capture, [data-ph-no-capture]",
          recordHeaders: false,
          recordBody: false,
          maskCapturedNetworkRequestFn: (request) => {
            const name = sanitizeUrl(request.name);
            return name ? { ...request, name } : null;
          },
        },
        before_send: (event) => {
          if (!event) return null;

          const properties = { ...event.properties };
          const currentUrl = sanitizeUrl(properties.$current_url);
          const referrer = sanitizeUrl(properties.$referrer);

          if (currentUrl) properties.$current_url = currentUrl;
          else delete properties.$current_url;

          if (referrer) properties.$referrer = referrer;
          else delete properties.$referrer;

          const pathname = currentUrl
            ? new URL(currentUrl).pathname
            : window.location.pathname;

          properties.route_name = getRouteName(pathname);
          properties.app_environment =
            import.meta.env.VITE_APP_ENV || import.meta.env.MODE;
          properties.app_version =
            import.meta.env.VITE_APP_VERSION || "unknown";

          return { ...event, properties };
        },
      });

      posthog.opt_in_capturing();
      if (replayEnabled) posthog.startSessionRecording();
      posthogClient = posthog;
      window.dispatchEvent(
        new CustomEvent("savekaro:analytics-consent-changed"),
      );
      return posthog;
    })
    .catch(() => null)
    .finally(() => {
      posthogPromise = null;
    });

  return posthogPromise;
}

export function initializeAnalytics() {
  if (initialized) return;
  initialized = true;

  if (!isAnalyticsConfigured || readStoredConsent() !== "granted") {
    disableLegacyUmami();
    return;
  }

  enableLegacyUmami();
  const schedule = window.requestIdleCallback
    ? (callback: () => void) =>
        window.requestIdleCallback(callback, { timeout: 2_000 })
    : (callback: () => void) => window.setTimeout(callback, 1_200);
  schedule(() => void loadAnalyticsClient());
}

export function getAnalyticsConsent(): AnalyticsConsent {
  if (!isAnalyticsConfigured) return "pending";
  return readStoredConsent();
}

export function grantAnalyticsConsent() {
  if (!isAnalyticsConfigured) return;
  storeConsent("granted");
  enableLegacyUmami();
  window.dispatchEvent(
    new CustomEvent("savekaro:analytics-consent-changed"),
  );
  void loadAnalyticsClient().then((client) => {
    client?.opt_in_capturing();
    client?.capture("privacy:analytics_consent_granted");
  });
}

export function denyAnalyticsConsent() {
  if (!isAnalyticsConfigured) return;
  storeConsent("denied");
  posthogClient?.opt_out_capturing();
  disableLegacyUmami();
  window.dispatchEvent(
    new CustomEvent("savekaro:analytics-consent-changed"),
  );
}

export function isAnalyticsCapturing(): boolean {
  return Boolean(posthogClient?.is_capturing());
}

export function getAnalyticsRequestHeaders(): Record<string, string> {
  return isAnalyticsCapturing()
    ? { "X-SaveKaro-Analytics-Consent": "granted" }
    : {};
}

export function captureAnalyticsEvent(
  event: string,
  properties?: Record<string, unknown>,
) {
  if (readStoredConsent() !== "granted") return;
  void loadAnalyticsClient().then((client) => client?.capture(event, properties));
}

export function captureAnalyticsException(
  error: unknown,
  properties?: Record<string, unknown>,
) {
  if (readStoredConsent() !== "granted") return;
  void loadAnalyticsClient().then((client) =>
    client?.captureException(error, properties),
  );
}

export function identifyAnalyticsUser(
  userId: string,
  properties?: Record<string, unknown>,
) {
  if (readStoredConsent() !== "granted") return;
  void loadAnalyticsClient().then((client) => client?.identify(userId, properties));
}

export function resetAnalyticsIdentity() {
  if (!posthogClient) return;
  posthogClient.reset();
  if (readStoredConsent() === "granted") posthogClient.opt_in_capturing();
}

export function openAnalyticsPreferences() {
  window.dispatchEvent(new CustomEvent("savekaro:open-analytics-preferences"));
}
