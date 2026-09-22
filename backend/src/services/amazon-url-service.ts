import { createHash } from "node:crypto";
import logger from "../lib/logger";
import { cacheGet, cacheSet } from "../lib/cache";
import { normalizeHost } from "../lib/url";

const AMAZON_HOST_PATTERN = /(^|\.)amazon\./i;
const AMAZON_REDIRECT_HOST_PATTERN =
  /^amzn\.(?:to|com|in|co\.uk|de|ca|com\.au)$/i;
const RESOLVED_URL_CACHE_TTL_SECONDS = 24 * 60 * 60;
const UNRESOLVED_URL_CACHE_TTL_SECONDS = 5 * 60;
const HEAD_REQUEST_BUDGET_MS = 1500;
const CACHE_LOOKUP_BUDGET_MS = 250;
const inFlightResolutions = new Map<string, Promise<string>>();

function isAmazonHost(host: string): boolean {
  return AMAZON_HOST_PATTERN.test(host);
}

export function isAmazonRedirectHost(host: string): boolean {
  return AMAZON_REDIRECT_HOST_PATTERN.test(host);
}

async function followRedirects(
  rawUrl: string,
  method: "HEAD" | "GET",
  timeoutMs: number,
): Promise<string | null> {
  if (timeoutMs <= 0) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(rawUrl, {
      method,
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SaveKaroBot/1.0; +https://savekaro.online)",
      },
    });

    return response.url || rawUrl;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function getCacheKey(rawUrl: string): string {
  const digest = createHash("sha256").update(rawUrl).digest("hex");
  return `amazon-url:${digest}`;
}

async function settleWithin<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T | null> {
  if (timeoutMs <= 0) return null;

  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve(null), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      () => {
        clearTimeout(timeoutId);
        resolve(null);
      },
    );
  });
}

async function resolveWithDeadline(
  rawUrl: string,
  deadline: number,
): Promise<string> {
  const remainingAfter = () => Math.max(0, deadline - Date.now());
  const headResolved = await followRedirects(
    rawUrl,
    "HEAD",
    Math.min(HEAD_REQUEST_BUDGET_MS, remainingAfter()),
  );
  const headHost = headResolved ? normalizeHost(headResolved) : null;

  if (headResolved && headHost && isAmazonHost(headHost)) {
    logger.debug(
      { rawUrl, resolvedUrl: headResolved, method: "HEAD" },
      "Resolved Amazon redirect URL",
    );
    return headResolved;
  }

  const getResolved = await followRedirects(rawUrl, "GET", remainingAfter());
  const getHost = getResolved ? normalizeHost(getResolved) : null;

  if (getResolved && getHost && isAmazonHost(getHost)) {
    logger.debug(
      { rawUrl, resolvedUrl: getResolved, method: "GET" },
      "Resolved Amazon redirect URL",
    );
    return getResolved;
  }

  return rawUrl;
}

export async function resolveAmazonProductUrl(
  rawUrl: string,
  options?: {
    timeoutMs?: number;
  },
): Promise<string> {
  if (!rawUrl) {
    return rawUrl;
  }

  const host = normalizeHost(rawUrl);
  if (!host) {
    return rawUrl;
  }

  if (isAmazonHost(host)) {
    return rawUrl;
  }

  if (!isAmazonRedirectHost(host)) {
    return rawUrl;
  }

  const timeoutMs = Math.max(1, options?.timeoutMs ?? 4000);
  const deadline = Date.now() + timeoutMs;
  const cacheKey = getCacheKey(rawUrl);
  const cached = await settleWithin(
    cacheGet<string>(cacheKey),
    Math.min(CACHE_LOOKUP_BUDGET_MS, timeoutMs),
  );
  if (cached) return cached;

  const existingResolution = inFlightResolutions.get(cacheKey);
  if (existingResolution) {
    return (
      (await settleWithin(existingResolution, deadline - Date.now())) ?? rawUrl
    );
  }

  const resolution = resolveWithDeadline(rawUrl, deadline).then((resolvedUrl) => {
    if (resolvedUrl !== rawUrl || timeoutMs >= 1000) {
      const ttl =
        resolvedUrl === rawUrl
          ? UNRESOLVED_URL_CACHE_TTL_SECONDS
          : RESOLVED_URL_CACHE_TTL_SECONDS;
      void cacheSet(cacheKey, resolvedUrl, ttl);
    }
    return resolvedUrl;
  });
  inFlightResolutions.set(cacheKey, resolution);
  void resolution.then(
    () => {
      if (inFlightResolutions.get(cacheKey) === resolution) {
        inFlightResolutions.delete(cacheKey);
      }
    },
    () => {
      if (inFlightResolutions.get(cacheKey) === resolution) {
        inFlightResolutions.delete(cacheKey);
      }
    },
  );

  return (await settleWithin(resolution, deadline - Date.now())) ?? rawUrl;
}
