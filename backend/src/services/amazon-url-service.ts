import logger from "../lib/logger";

const AMAZON_HOST_PATTERN = /(^|\.)amazon\./i;
const AMAZON_REDIRECT_HOST_PATTERN =
  /^amzn\.(?:to|com|in|co\.uk|de|ca|com\.au)$/i;

function normalizeHost(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

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

  const timeoutMs = options?.timeoutMs ?? 4000;
  const headResolved = await followRedirects(rawUrl, "HEAD", timeoutMs);
  const headHost = headResolved ? normalizeHost(headResolved) : null;

  if (headResolved && headHost && isAmazonHost(headHost)) {
    logger.debug(
      { rawUrl, resolvedUrl: headResolved, method: "HEAD" },
      "Resolved Amazon redirect URL",
    );
    return headResolved;
  }

  const getResolved = await followRedirects(rawUrl, "GET", timeoutMs);
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
