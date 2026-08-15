import posthog from "posthog-js";

const POSTHOG_TOKEN = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN?.trim();
const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
const POSTHOG_UI_HOST =
  import.meta.env.VITE_POSTHOG_UI_HOST?.trim() || "https://us.posthog.com";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

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

let initialized = false;

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
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }

  try {
    const url = new URL(value, window.location.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
}

function getApiHostname(): string[] {
  try {
    return [new URL(API_URL).hostname];
  } catch {
    return [];
  }
}

export function getRouteName(pathname: string): string {
  if (/^\/deal\/[^/]+$/.test(pathname)) return "/deal/:id";
  if (pathname.startsWith("/auth/")) return "/auth/:action";
  return pathname || "/";
}

export function initializeAnalytics() {
  if (initialized || !isAnalyticsConfigured || !POSTHOG_TOKEN) {
    return;
  }

  initialized = true;

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
      properties.app_version = import.meta.env.VITE_APP_VERSION || "unknown";

      return { ...event, properties };
    },
  });

  if (
    !consentRequired ||
    posthog.get_explicit_consent_status() === "granted"
  ) {
    enableLegacyUmami();
  } else {
    disableLegacyUmami();
  }
}

export type AnalyticsConsent = "granted" | "denied" | "pending";

export function getAnalyticsConsent(): AnalyticsConsent {
  if (!isAnalyticsConfigured || !initialized) return "pending";
  return posthog.get_explicit_consent_status();
}

export function grantAnalyticsConsent() {
  if (!isAnalyticsConfigured || !initialized) return;

  posthog.opt_in_capturing({
    captureEventName: "privacy:analytics_consent_granted",
  });
  enableLegacyUmami();

  if (replayEnabled) {
    posthog.startSessionRecording();
  }

  window.dispatchEvent(
    new CustomEvent("savekaro:analytics-consent-changed"),
  );
}

export function denyAnalyticsConsent() {
  if (!isAnalyticsConfigured || !initialized) return;
  posthog.opt_out_capturing();
  disableLegacyUmami();
  window.dispatchEvent(
    new CustomEvent("savekaro:analytics-consent-changed"),
  );
}

export function isAnalyticsCapturing(): boolean {
  return Boolean(
    isAnalyticsConfigured && initialized && posthog.is_capturing(),
  );
}

export function getAnalyticsRequestHeaders(): Record<string, string> {
  return isAnalyticsCapturing()
    ? { "X-SaveKaro-Analytics-Consent": "granted" }
    : {};
}

export function openAnalyticsPreferences() {
  window.dispatchEvent(new CustomEvent("savekaro:open-analytics-preferences"));
}

export { posthog };
