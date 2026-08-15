import type { Context } from "hono";
import { PostHog } from "posthog-node";
import logger from "./logger";

const POSTHOG_TOKEN = process.env.POSTHOG_PROJECT_TOKEN?.trim();
const POSTHOG_HOST =
  process.env.POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
const POSTHOG_ENABLED =
  process.env.POSTHOG_ENABLED?.toLowerCase() === "true";

const client =
  POSTHOG_ENABLED && POSTHOG_TOKEN
    ? new PostHog(POSTHOG_TOKEN, {
        host: POSTHOG_HOST,
        flushAt: 20,
        flushInterval: 10_000,
        privacyMode: true,
        enableExceptionAutocapture: false,
      })
    : null;

type AnalyticsPrimitive = string | number | boolean | null | undefined;
export type ServerAnalyticsProperties = Record<string, AnalyticsPrimitive>;

export function getDealAnalyticsProperties(deal: {
  id: string;
  categoryId?: string | null;
  store?: string | null;
  storeKey?: string | null;
  region?: string | null;
  source?: string | null;
  discountPercent?: number | null;
}): ServerAnalyticsProperties {
  return {
    deal_id: deal.id,
    category_id: deal.categoryId ?? "unknown",
    store: deal.storeKey || deal.store?.trim() || "unknown",
    region: deal.region ?? "unknown",
    source: deal.source ?? "unknown",
    discount_percent: deal.discountPercent ?? null,
  };
}

export type ServerAnalyticsEvent =
  | "auth:login_complete"
  | "deal:submit_complete"
  | "deal:vote_change"
  | "deal:save_change"
  | "deal:merchant_click"
  | "comment:create"
  | "notification:read"
  | "alert:create"
  | "alert:status_change"
  | "alert:delete";

const CONSENT_HEADER = "X-SaveKaro-Analytics-Consent";
const DISTINCT_ID_HEADER = "X-PostHog-Distinct-Id";
const SESSION_ID_HEADER = "X-PostHog-Session-Id";
const WINDOW_ID_HEADER = "X-PostHog-Window-Id";

function cleanAnalyticsId(value: string | undefined): string | undefined {
  if (!value || value.length > 200) return undefined;
  return /^[a-zA-Z0-9._:-]+$/.test(value) ? value : undefined;
}

export function hasAnalyticsConsent(c: Context): boolean {
  return c.req.header(CONSENT_HEADER)?.toLowerCase() === "granted";
}

export function captureServerEvent(
  c: Context,
  event: ServerAnalyticsEvent,
  properties: ServerAnalyticsProperties = {},
  distinctIdOverride?: string,
) {
  if (!client || !hasAnalyticsConsent(c)) return;

  const distinctId =
    cleanAnalyticsId(distinctIdOverride) ||
    cleanAnalyticsId(c.get("userId") || undefined) ||
    cleanAnalyticsId(c.req.header(DISTINCT_ID_HEADER));

  if (!distinctId) return;

  const sessionId = cleanAnalyticsId(c.req.header(SESSION_ID_HEADER));
  const windowId = cleanAnalyticsId(c.req.header(WINDOW_ID_HEADER));

  try {
    client.capture({
      distinctId,
      event,
      properties: {
        ...properties,
        app_environment: process.env.APP_ENV || process.env.NODE_ENV || "unknown",
        service: "savekaro-api",
        request_id: c.get("requestId"),
        $session_id: sessionId,
        $window_id: windowId,
        $geoip_disable: true,
      },
    });
  } catch (error) {
    logger.warn({ error, event }, "PostHog capture failed");
  }
}

export function captureServerException(c: Context, error: unknown) {
  if (!client || !hasAnalyticsConsent(c)) return;

  const distinctId =
    cleanAnalyticsId(c.get("userId") || undefined) ||
    cleanAnalyticsId(c.req.header(DISTINCT_ID_HEADER));
  if (!distinctId) return;

  try {
    client.captureException(error, distinctId, {
      request_id: c.get("requestId"),
      method: c.req.method,
      route: c.req.path,
      $session_id: cleanAnalyticsId(c.req.header(SESSION_ID_HEADER)),
      $geoip_disable: true,
    });
  } catch (captureError) {
    logger.warn({ error: captureError }, "PostHog exception capture failed");
  }
}

export async function shutdownAnalytics() {
  if (!client) return;

  try {
    await client.shutdown(5_000);
  } catch (error) {
    logger.warn({ error }, "PostHog shutdown flush failed");
  }
}
