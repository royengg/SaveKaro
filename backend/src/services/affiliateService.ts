/**
 * AffiliateService — injects affiliate tracking parameters into outgoing deal URLs.
 *
 * ETHICS POLICY: We never overwrite an existing affiliate tag.
 * If a Reddit user already has their own referral ID in the URL, we respect it
 * and return the URL unchanged. We only inject our tag on clean (untagged) URLs.
 *
 * How to add a new store:
 *   1. Add an entry to STORE_CONFIGS
 *   2. Set `ownershipParam` to the param name that signals "someone owns this link"
 *   3. Provide an `inject` function that adds your params
 */

import logger from "../lib/logger";

// ─── Store Config ─────────────────────────────────────────────────────────────

interface StoreConfig {
  /** Lowercase fragment matched against store name or URL hostname */
  fragment: string;
  /**
   * The affiliate ownership param for this store.
   * If this param is already present in the URL, we skip injection entirely.
   * e.g. Amazon uses "tag", Flipkart uses "affid"
   */
  ownershipParam: string;
  /** Mutates the URL object to add affiliate params */
  inject: (url: URL) => void;
}

const STORE_CONFIGS: StoreConfig[] = [
  {
    // Amazon India Associates — https://affiliate-program.amazon.in
    fragment: "amazon",
    ownershipParam: "tag",
    inject: (url) => {
      url.searchParams.set(
        "tag",
        process.env.AMAZON_AFFILIATE_TAG ?? "savekaro0c-21",
      );
    },
  },
  {
    // Flipkart Affiliate — https://affiliate.flipkart.com
    fragment: "flipkart",
    ownershipParam: "affid",
    inject: (url) => {
      url.searchParams.set(
        "affid",
        process.env.FLIPKART_AFFILIATE_ID ?? "savekaro",
      );
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
];

// ─── Core Function ────────────────────────────────────────────────────────────

/**
 * Returns a URL string with affiliate params injected — but ONLY if the URL
 * does not already contain an affiliate ownership param (e.g. an existing `tag=`
 * from a Reddit user's own link). We never overwrite someone else's referral.
 *
 * Falls back to the original URL if the store is unknown, already tagged,
 * or the URL is malformed.
 */
export function injectAffiliateTag(
  rawUrl: string,
  store?: string | null,
): string {
  if (!rawUrl) return rawUrl;

  try {
    const url = new URL(rawUrl);
    const needle = (store ?? url.hostname).toLowerCase();

    const config = STORE_CONFIGS.find(
      ({ fragment }) =>
        needle.includes(fragment) || url.hostname.includes(fragment),
    );

    if (!config) {
      // Unknown store — return URL unchanged
      return rawUrl;
    }

    // ✅ Ethical guard: if the ownership param is already set, someone else
    // owns this referral. Respect it and return the original URL.
    if (url.searchParams.has(config.ownershipParam)) {
      logger.debug(
        { rawUrl, store, ownershipParam: config.ownershipParam },
        "AffiliateService: URL already has affiliate param, skipping injection",
      );
      return rawUrl;
    }

    // Clean URL — safe to inject our tag
    config.inject(url);
    return url.toString();
  } catch {
    logger.warn({ rawUrl, store }, "AffiliateService: failed to parse URL");
    return rawUrl;
  }
}
