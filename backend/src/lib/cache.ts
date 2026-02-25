import { getRedisConnection } from "./redis";
import logger from "./logger";

const USE_QUEUE = process.env.USE_QUEUE === "true";

/**
 * Simple Redis cache helper.
 * Only works when Redis is available (USE_QUEUE=true).
 * Returns null on cache miss or when Redis is unavailable.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!USE_QUEUE) return null;

  try {
    const redis = getRedisConnection();
    const cached = await redis.get(`cache:${key}`);
    if (cached) {
      return JSON.parse(cached) as T;
    }
    return null;
  } catch (err) {
    logger.warn({ err, key }, "Cache get failed");
    return null;
  }
}

/**
 * Store a value in Redis cache with a TTL.
 */
export async function cacheSet(
  key: string,
  data: unknown,
  ttlSeconds: number = 60,
): Promise<void> {
  if (!USE_QUEUE) return;

  try {
    const redis = getRedisConnection();
    await redis.set(`cache:${key}`, JSON.stringify(data), "EX", ttlSeconds);
  } catch (err) {
    logger.warn({ err, key }, "Cache set failed");
  }
}

/**
 * Invalidate a cache key.
 */
export async function cacheInvalidate(key: string): Promise<void> {
  if (!USE_QUEUE) return;

  try {
    const redis = getRedisConnection();
    await redis.del(`cache:${key}`);
  } catch (err) {
    logger.warn({ err, key }, "Cache invalidate failed");
  }
}

/**
 * Invalidate all keys matching a pattern (e.g. "deals:*").
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  if (!USE_QUEUE) return;

  try {
    const redis = getRedisConnection();
    const keys = await redis.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    logger.warn({ err, pattern }, "Cache invalidate pattern failed");
  }
}
