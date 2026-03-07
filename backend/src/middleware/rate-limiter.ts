import { Context, Next } from "hono";
import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import logger from "../lib/logger";
import { RATE_LIMITS } from "../config/constants";

// Try to use Redis for rate limiting if available, fallback to in-memory
let redisClient: any = null;

async function getRedisClient() {
  if (redisClient) return redisClient;

  try {
    if (process.env.REDIS_URL) {
      const { default: Redis } = await import("ioredis");
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        lazyConnect: true,
      });
      await redisClient.connect();
      logger.info("Rate limiter using Redis");
      return redisClient;
    }
  } catch (err) {
    logger.warn("Redis unavailable for rate limiter, using in-memory fallback");
  }
  return null;
}

// Create rate limiter (Redis-backed if available, memory fallback)
function createLimiter(opts: { points: number; duration: number }) {
  const redis = redisClient;
  if (redis) {
    return new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: "rl",
      ...opts,
    });
  }
  return new RateLimiterMemory(opts);
}

// Initialize rate limiters using centralized configuration
let generalLimiter = new RateLimiterMemory(RATE_LIMITS.GENERAL);
let authLimiter = new RateLimiterMemory(RATE_LIMITS.AUTH);
let submitLimiter = new RateLimiterMemory(RATE_LIMITS.SUBMIT);
let clickLimiter = new RateLimiterMemory(RATE_LIMITS.CLICK);

// Upgrade to Redis when available
getRedisClient().then((redis) => {
  if (redis) {
    generalLimiter = createLimiter(RATE_LIMITS.GENERAL);
    authLimiter = createLimiter(RATE_LIMITS.AUTH);
    submitLimiter = createLimiter(RATE_LIMITS.SUBMIT);
    clickLimiter = createLimiter(RATE_LIMITS.CLICK);
    logger.info("Rate limiters upgraded to Redis");
  }
});

export function createRateLimiter(
  type: "general" | "auth" | "submit" | "click" = "general",
) {
  return async (c: Context, next: Next) => {
    const limiter =
      type === "auth"
        ? authLimiter
        : type === "submit"
          ? submitLimiter
          : type === "click"
            ? clickLimiter
            : generalLimiter;

    const ip =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";

    try {
      await limiter.consume(ip);
      await next();
    } catch (rateLimiterRes: any) {
      const retryAfter = Math.ceil(
        (rateLimiterRes?.msBeforeNext ?? 60000) / 1000,
      );
      c.header("Retry-After", String(retryAfter));
      return c.json(
        {
          success: false,
          error: "Too many requests, please try again later",
        },
        429,
      );
    }
  };
}

// Convenience exports
export const rateLimiter = createRateLimiter("general");
export const authRateLimiter = createRateLimiter("auth");
export const submitRateLimiter = createRateLimiter("submit");
export const clickRateLimiter = createRateLimiter("click");
