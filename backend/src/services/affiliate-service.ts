import logger from "../lib/logger";


interface StoreConfig {
  fragment: string;
  ownershipParam: string;
  inject: (url: URL, region?: string) => void;
}

const AMAZON_REDIRECT_HOST_PATTERN =
  /^amzn\.(?:to|com|in|co\.uk|de|ca|com\.au)$/i;

const STORE_CONFIGS: StoreConfig[] = [
  {
    fragment: "amazon",
    ownershipParam: "tag",
    inject: (url, region?: string) => {
      // If hostname is explicitly amazon.in → India tag
      // If hostname is explicitly amazon.ca → Canada tag
      // If hostname is an amzn.* redirect and region is INDIA → India tag
      // If hostname is an amzn.* redirect and region is CANADA → Canada tag
      // Everything else → US tag
      const normalizedHost = url.hostname.replace(/^www\./i, "").toLowerCase();
      const isIndia =
        normalizedHost.includes("amazon.in") ||
        normalizedHost === "amzn.in" ||
        (AMAZON_REDIRECT_HOST_PATTERN.test(normalizedHost) &&
          region === "INDIA");
      const isCanada =
        normalizedHost.includes("amazon.ca") ||
        normalizedHost === "amzn.ca" ||
        (AMAZON_REDIRECT_HOST_PATTERN.test(normalizedHost) &&
          region === "CANADA");
      const tag = isIndia
        ? (process.env.AMAZON_IN_AFFILIATE_TAG ?? "savekaro0c-21")
        : isCanada
          ? (process.env.AMAZON_CA_AFFILIATE_TAG ??
            process.env.AMAZON_US_AFFILIATE_TAG ??
            "savekaro-20")
          : (process.env.AMAZON_US_AFFILIATE_TAG ?? "savekaro-20");
      url.searchParams.set("tag", tag);
    },
  },
  {
    fragment: "myntra",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    fragment: "meesho",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    fragment: "ajio",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    fragment: "nykaa",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    fragment: "snapdeal",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    fragment: "croma",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    fragment: "reliancedigital",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    fragment: "boat-lifestyle",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },

  {
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
    fragment: "walmart.com",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    fragment: "target.com",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    fragment: "newegg.com",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    fragment: "bhphotovideo.com",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
  {
    fragment: "gamestop.com",
    ownershipParam: "utm_source",
    inject: (url) => {
      url.searchParams.set("utm_source", "savekaro");
      url.searchParams.set("utm_medium", "affiliate");
    },
  },
];

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

    config.inject(url, region ?? undefined);
    return url.toString();
  } catch {
    logger.warn({ rawUrl, store }, "AffiliateService: failed to parse URL");
    return rawUrl;
  }
}
