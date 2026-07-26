import { DealRegion } from "@prisma/client";

export const RATE_LIMITS = {
  GENERAL: { points: 100, duration: 60 },
  AUTH: { points: 30, duration: 60 },
  OAUTH: { points: 120, duration: 60 },
  SUBMIT: { points: 5, duration: 3600 },
  CLICK: { points: 30, duration: 60 },
} as const;

export const SUBREDDIT_CONFIG: Record<DealRegion, string[]> = {
  INDIA: [
    "dealsforindia",
    "GreatIndiaDeals",
    "StealDealsIndia",
    "IndianGenericDeals",
    "IndiaDeals",
    "LaptopDealsIndia",
    "IndianBeautyDeals",
    "dealsOffersFreebies",
    "SneakersOfferIndia",
    "IndianDealHunters",
    "LooteraShopper",
  ],
  CANADA: [
    "canadadeals",
    "VideoGameDealsCanada",
    "TopDealsCanada",
    "ShopCanada",
    "DailyDealsCanada",
  ],
  WORLD: [
    "deals",
    "buildapcsales",
    "GameDeals",
    "DealsReddit",
    "FreeGameFindings",
    "frugalmalefashion",
  ],
};

export const BATCH_SIZES = {
  TITLE_CLASSIFIER: 20,
  DEAL_PROCESSING: 50,
  REDDIT_POSTS_NEW: 50,
  REDDIT_POSTS_HOT: 25,
  REDDIT_POSTS_RISING: 25,
  REDDIT_COMMENTS: 15,
  REDDIT_COMMENT_LOOKUPS_PER_BATCH: 8,
} as const;

export const GEMINI_LIMITS = {
  TITLE_CLASSIFIER_DAILY_REQUESTS: 450,
} as const;

export const PAGINATION_DEFAULTS = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

export const PRICE_ALERT_LIMITS = {
  MAX_ALERTS_PER_USER: 10,
} as const;

export const SCRAPE_INTERVALS = {
  REDDIT_SCRAPER: "*/30 * * * *", // Every 30 minutes
  TITLE_CLASSIFIER_INTERVAL: "10,40 * * * *", // 10 minutes after each scraper run
} as const;

export const REDDIT_THROTTLE = {
  REQUEST_GAP_MS: 1500,
  COOLDOWN_MS: 120000,
  SCRAPE_WORKER_CONCURRENCY: 1,
} as const;

export const CACHE_TTL = {
  DEALS_LIST: 120,
  STATS: 60,
  CATEGORIES: 300,
} as const;

export const CONTENT_LIMITS = {
  COMMENT_MAX_LENGTH: 1000,
  TITLE_MAX_LENGTH: 200,
  TITLE_MIN_LENGTH: 5,
  DESCRIPTION_MAX_LENGTH: 2000,
} as const;

export const TOKEN_LIFETIMES = {
  ACCESS_TOKEN: "15m",
  REFRESH_TOKEN: "7d",
  ACCESS_TOKEN_SECONDS: 900,
} as const;

export const AUTH_CACHE = {
  USER_REVALIDATION_MS: 5 * 60 * 1000,
  MAX_USERS: 10000,
} as const;
