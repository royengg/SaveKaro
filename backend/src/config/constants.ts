import { DealRegion } from "@prisma/client";

// Rate limiting configuration
export const RATE_LIMITS = {
  GENERAL: { points: 100, duration: 60 },
  AUTH: { points: 30, duration: 60 },
  OAUTH: { points: 120, duration: 60 },
  SUBMIT: { points: 5, duration: 3600 },
  CLICK: { points: 30, duration: 60 },
} as const;

// Reddit scraping configuration
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
    "IndianDealHunters",
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

// Batch processing sizes
export const BATCH_SIZES = {
  TITLE_CLASSIFIER: 20,
  TITLE_CLASSIFIER_INCREMENTAL: 4,
  TITLE_CLASSIFIER_BACKFILL: 24,
  DEAL_PROCESSING: 50,
  REDDIT_POSTS_NEW: 50,
  REDDIT_POSTS_HOT: 25,
  REDDIT_POSTS_RISING: 25,
  REDDIT_COMMENTS: 15,
  REDDIT_COMMENT_LOOKUPS_PER_BATCH: 8,
} as const;

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1,
} as const;

// Price alert limits
export const PRICE_ALERT_LIMITS = {
  MAX_ALERTS_PER_USER: 10,
} as const;

// Scraping intervals
export const SCRAPE_INTERVALS = {
  REDDIT_SCRAPER: "*/30 * * * *", // Every 30 minutes
  TITLE_CLASSIFIER_INCREMENTAL: "*/30 * * * *", // Every 30 minutes
  TITLE_CLASSIFIER_BACKFILL: "0 2 * * *", // 2:00 AM Asia/Kolkata
} as const;

export const REDDIT_THROTTLE = {
  REQUEST_GAP_MS: 1500,
  COOLDOWN_MS: 120000,
  SCRAPE_WORKER_CONCURRENCY: 1,
} as const;

// Cache TTL values (in seconds)
export const CACHE_TTL = {
  DEALS_LIST: 120, // 2 minutes
  STATS: 60, // 1 minute
  CATEGORIES: 300, // 5 minutes
} as const;

// Comment and content limits
export const CONTENT_LIMITS = {
  COMMENT_MAX_LENGTH: 1000,
  TITLE_MAX_LENGTH: 200,
  TITLE_MIN_LENGTH: 5,
  DESCRIPTION_MAX_LENGTH: 2000,
} as const;

// JWT token lifetimes
export const TOKEN_LIFETIMES = {
  ACCESS_TOKEN: "15m",
  REFRESH_TOKEN: "7d",
  ACCESS_TOKEN_SECONDS: 900, // 15 minutes
} as const;

// Auth cache tuning (for reducing per-request DB hits in auth middleware)
export const AUTH_CACHE = {
  USER_REVALIDATION_MS: 5 * 60 * 1000, // 5 minutes
  MAX_USERS: 10000,
} as const;
