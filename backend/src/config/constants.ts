/**
 * Application constants and configuration
 * Centralized location for all magic numbers and configuration values
 */

import { DealRegion } from "@prisma/client";

// Rate limiting configuration
export const RATE_LIMITS = {
  GENERAL: { points: 100, duration: 60 },
  AUTH: { points: 30, duration: 60 },
  SUBMIT: { points: 5, duration: 3600 },
  CLICK: { points: 30, duration: 60 },
} as const;

// Reddit scraping configuration
export const SUBREDDIT_CONFIG: Record<DealRegion, string[]> = {
  INDIA: ["dealsforindia", "Lootdealsforindia"],
  WORLD: ["GamingDeals", "deals", "DealsReddit", "dealsonamazon", "DealCove"],
};

// Batch processing sizes
export const BATCH_SIZES = {
  TITLE_CLASSIFIER: 20,
  DEAL_PROCESSING: 50,
  REDDIT_POSTS_NEW: 50,
  REDDIT_POSTS_HOT: 25,
  REDDIT_POSTS_RISING: 25,
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
  TITLE_CLASSIFIER: "0 20 * * *", // 2:00 AM IST (20:30 UTC previous day)
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
