import { Context, Next } from "hono";
import { RateLimiterMemory, RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import logger from "../lib/logger";
import { RATE_LIMITS } from "../config/constants";
import { Redis } from "ioredis";

type LimiterType = "general" | "auth" | "oauth" | "submit" | "click";
const limits = {
  general: RATE_LIMITS.GENERAL, auth: RATE_LIMITS.AUTH,
  oauth: RATE_LIMITS.OAUTH, submit: RATE_LIMITS.SUBMIT, click: RATE_LIMITS.CLICK,
};
const memory = Object.fromEntries(
  Object.entries(limits).map(([key, opts]) => [key, new RateLimiterMemory(opts)]),
) as Record<LimiterType, RateLimiterMemory>;
const distributed: Partial<Record<LimiterType, RateLimiterRedis>> = {};
let backend: "memory" | "redis" | "memory-fallback" = process.env.REDIS_URL ? "memory-fallback" : "memory";
let fallbackActivations = 0;
let fallbackLogged = false;

function recordFallback(err: unknown) {
  backend = "memory-fallback";
  if (!fallbackLogged) {
    fallbackLogged = true;
    fallbackActivations++;
    logger.warn({ err, event: "rate_limiter_fallback", fallbackActivations }, "Redis rate limiting unavailable; using per-instance memory");
  }
}

export function getRateLimiterStatus() {
  return { backend, fallbackActivations };
}

if (process.env.REDIS_URL) {
  const redis = new Redis(process.env.REDIS_URL, {
    lazyConnect: true, connectTimeout: 3000,
    maxRetriesPerRequest: 1, enableOfflineQueue: false,
  });
  redis.on("error", recordFallback);
  redis.on("close", () => recordFallback(new Error("Redis connection closed")));
  redis.on("ready", () => {
    for (const type of Object.keys(limits) as LimiterType[]) {
      distributed[type] = new RateLimiterRedis({
        storeClient: redis, keyPrefix: `rl:${type}`, ...limits[type],
      });
    }
    backend = "redis";
    fallbackLogged = false;
    logger.info({ event: "rate_limiter_redis_ready" }, "Rate limiters using Redis");
  });
  void redis.connect().catch(recordFallback);
}

export function createRateLimiter(type: LimiterType = "general") {
  return async (c: Context, next: Next) => {
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    try {
      const limiter = distributed[type];
      if (backend === "redis" && limiter) {
        try {
          await limiter.consume(ip);
        } catch (err) {
          if (err instanceof RateLimiterRes) throw err;
          recordFallback(err);
          await memory[type].consume(ip);
        }
      } else {
        await memory[type].consume(ip);
      }
    } catch (err) {
      if (!(err instanceof RateLimiterRes)) throw err;
      c.header("Retry-After", String(Math.max(1, Math.ceil(err.msBeforeNext / 1000))));
      return c.json({ success: false, error: "Too many requests, please try again later" }, 429);
    }
    // Application errors must propagate to the error handler, never become a 429.
    await next();
  };
}

export const rateLimiter = createRateLimiter("general");
export const authRateLimiter = createRateLimiter("auth");
export const oauthRateLimiter = createRateLimiter("oauth");
export const submitRateLimiter = createRateLimiter("submit");
export const clickRateLimiter = createRateLimiter("click");
