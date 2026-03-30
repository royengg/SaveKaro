import logger from "../lib/logger";

// ─── Store Config ─────────────────────────────────────────────────────────────

interface StoreConfig {
  /** Lowercase fragment matched against store name or URL hostname */
  fragment: string;
  ownershipParam: string;
  /** Mutates the URL object to add affiliate params. Receives optional region for region-aware tag selection. */
  inject: (url: URL, region?: string) => void;
}

const AMAZON_REDIRECT_HOST_PATTERN =
  /^amzn\.(?:to|com|in|co\.uk|de|ca|com\.au)$/i;

const STORE_CONFIGS: StoreConfig[] = [
  // ── India ──────────────────────────────────────────────────────────────────
  {
    // Amazon — single entry covers amazon.* and amzn.* hosts.
    // The inject function picks the right tag based on the URL hostname.
    fragment: "amazon",
    ownershipParam: "tag",
    inject: (url, region?: string) => {
      // If hostname is explicitly amazon.in → India tag
      // If hostname is an amzn.* redirect and region is INDIA → India tag
      // Everything else → US tag
      const normalizedHost = url.hostname.replace(/^www\./i, "").toLowerCase();
      const isIndia =
        normalizedHost.includes("amazon.in") ||
        normalizedHost === "amzn.in" ||
        (AMAZON_REDIRECT_HOST_PATTERN.test(normalizedHost) &&
          region === "INDIA");
      const tag = isIndia
        ? (process.env.AMAZON_IN_AFFILIATE_TAG ?? "savekaro0c-21")
        : (process.env.AMAZON_US_AFFILIATE_TAG ?? "savekaro-20");
      url.searchParams.set("tag", tag);
    },
  },
  {
    // Myntra (UTM-based)
    fragment: "myntra",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    // Meesho
    fragment: "meesho",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    // Ajio
    fragment: "ajio",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    // Nykaa
    fragment: "nykaa",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    // Snapdeal
    fragment: "snapdeal",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    // Croma
    fragment: "croma",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    // Reliance Digital
    fragment: "reliancedigital",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    // Boat lifestyle
    fragment: "boat-lifestyle",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },

  // ── US / Global ────────────────────────────────────────────────────────────
  {
    // Best Buy — https://bestbuy.com (affiliate via Impact or CJ)
    fragment: "bestbuy.com",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
      if (process.env.BESTBUY_AFFILIATE_ID) {
        url.searchParams.set("ref", process.env.BESTBUY_AFFILIATE_ID);
      }
    },
  },
  {
    // Walmart — https://walmart.com (affiliate via Impact)
    fragment: "walmart.com",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    // Target — via Impact Radius
    fragment: "target.com",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    // Newegg — https://newegg.com (direct affiliate program)
    fragment: "newegg.com",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    // B&H Photo — https://bhphotovideo.com
    fragment: "bhphotovideo.com",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    // GameStop — via CJ Affiliate
    fragment: "gamestop.com",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
];

// ─── Core Function ────────────────────────────────────────────────────────────

/**
 * Returns a URL string with affiliate params injected for known stores.
 * Always injects our tag since SaveKaro is the referrer (traffic originates from our platform).
 * Falls back to the original URL if the store is unknown or the URL is malformed.
 */
export function injectAffiliateTag(
  rawUrl: string,
  store?: string | null,
  region?: string | null,
): string {
  if (!rawUrl) return rawUrl;

  try {
    const url = new URL(rawUrl);
    const needle = (store ?? url.hostname).toLowerCase();
    const hostname = url.hostname.replace(/^www\./i, "").toLowerCase();
    const isAmazonHost =
      hostname.includes("amazon.") ||
      AMAZON_REDIRECT_HOST_PATTERN.test(hostname);

    const config = STORE_CONFIGS.find(
      ({ fragment }) =>
        (fragment === "amazon" && isAmazonHost) ||
        needle.includes(fragment) ||
        url.hostname.includes(fragment),
    );

    if (!config) {
      return rawUrl;
    }

    if (config.fragment === "amazon" && !isAmazonHost) {
      logger.debug(
        { rawUrl, store },
        "AffiliateService: skipping Amazon tag injection for non-Amazon host",
      );
      return rawUrl;
    }

    // Always inject our tag — SaveKaro is the referrer
    config.inject(url, region ?? undefined);
    return url.toString();
  } catch {
    logger.warn({ rawUrl, store }, "AffiliateService: failed to parse URL");
    return rawUrl;
  }
}
