const TRACKING_QUERY_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "gclid",
  "fbclid",
  "msclkid",
  "igshid",
  "ref",
  "ref_",
  "source",
  "affid",
  "aff_id",
  "affiliate",
  "affiliate_id",
  "tag",
  "linkcode",
  "camp",
  "creative",
  "creativeasin",
  "ascsubtag",
  "psc",
  "smid",
]);

const TRACKING_QUERY_PARAM_PREFIXES = [
  "utm_",
  "mc_",
  "ga_",
  "pk_",
  "srsltid",
];

const PRODUCT_QUERY_PARAM_ALLOWLIST = new Set([
  "id",
  "pid",
  "sku",
  "model",
  "variant",
  "color",
  "size",
]);

function normalizeHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^(www|m)\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

function normalizePathname(pathname: string): string {
  const normalized = pathname.replace(/\/{2,}/g, "/").replace(/\/+$/g, "");
  return normalized || "/";
}

export function normalizeWatchedProductUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return null;
    }

    const host = parsed.hostname.replace(/^(www|m)\./i, "").toLowerCase();
    let pathname = normalizePathname(parsed.pathname);

    if (pathname === "/" && !parsed.searchParams.size) {
      return null;
    }

    if (/amazon\./i.test(host)) {
      const amazonMatch = pathname.match(
        /\/(?:gp\/product|dp|exec\/obidos\/ASIN)\/([A-Z0-9]{10})/i,
      );
      if (amazonMatch) {
        pathname = `/dp/${amazonMatch[1].toUpperCase()}`;
      }
      return `${host}${pathname}`;
    }

    const keptEntries = Array.from(parsed.searchParams.entries())
      .filter(([key, value]) => {
        const normalizedKey = key.trim().toLowerCase();
        if (!normalizedKey || !value.trim()) return false;
        if (TRACKING_QUERY_PARAMS.has(normalizedKey)) return false;
        if (
          TRACKING_QUERY_PARAM_PREFIXES.some((prefix) =>
            normalizedKey.startsWith(prefix),
          )
        ) {
          return false;
        }
        return PRODUCT_QUERY_PARAM_ALLOWLIST.has(normalizedKey);
      })
      .map(
        ([key, value]) =>
          [key.trim().toLowerCase(), value.trim().toLowerCase()] as const,
      )
      .sort(([a], [b]) => a.localeCompare(b));

    const normalizedQuery = keptEntries.length
      ? `?${new URLSearchParams(keptEntries as [string, string][]).toString()}`
      : "";

    if (pathname === "/" && !normalizedQuery) {
      return null;
    }

    return `${host}${pathname}${normalizedQuery}`;
  } catch {
    return null;
  }
}

export function buildWatchUrlLabel(url: string): string {
  try {
    const parsed = new URL(url);
    const host = normalizeHost(url) ?? parsed.hostname.toLowerCase();
    const hostLabel = host
      .replace(/\.(com|in|net|org|co|store|shop)$/i, "")
      .replace(/[.-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const segments = parsed.pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .reverse();

    const rawSegment =
      segments.find(
        (segment) =>
          segment.length > 3 &&
          !["dp", "gp", "product", "products", "item", "items", "p"].includes(
            segment.toLowerCase(),
          ),
      ) ?? "";

    const cleanedSegment = decodeURIComponent(rawSegment)
      .replace(/\.[a-z0-9]{2,5}$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/[^a-z0-9 ]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    const shortLabel = cleanedSegment
      .split(" ")
      .filter((part) => part.length > 1)
      .slice(0, 6)
      .join(" ");

    if (shortLabel) {
      return `${hostLabel} • ${shortLabel}`;
    }

    return `${hostLabel} watchlist`;
  } catch {
    return "Product URL watchlist";
  }
}
