import { getRedisConnection } from "./redis";
import logger from "./logger";

const USE_QUEUE = process.env.USE_QUEUE === "true";
const LOCAL_CACHE_MAX_KEYS = Math.max(
  200,
  parseInt(process.env.LOCAL_CACHE_MAX_KEYS || "1200", 10) || 1200,
);

interface LocalCacheEntry {
  value: string;
  expiresAt: number;
}

const localCache = new Map<string, LocalCacheEntry>();

function getPrefixedKey(key: string): string {
  return `cache:${key}`;
}

function pruneLocalCache() {
  if (localCache.size <= LOCAL_CACHE_MAX_KEYS) {
    return;
  }

  const now = Date.now();
  for (const [key, entry] of localCache.entries()) {
    if (entry.expiresAt <= now) {
      localCache.delete(key);
    }
    if (localCache.size <= LOCAL_CACHE_MAX_KEYS) {
      return;
    }
  }

  while (localCache.size > LOCAL_CACHE_MAX_KEYS) {
    const oldestKey = localCache.keys().next().value as string | undefined;
    if (!oldestKey) {
      break;
    }
    localCache.delete(oldestKey);
  }
}

function localCacheGet<T>(key: string): T | null {
  const prefixedKey = getPrefixedKey(key);
  const entry = localCache.get(prefixedKey);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    localCache.delete(prefixedKey);
    return null;
  }

  try {
    return JSON.parse(entry.value) as T;
  } catch {
    localCache.delete(prefixedKey);
    return null;
  }
}

function localCacheSet(key: string, data: unknown, ttlSeconds: number) {
  const prefixedKey = getPrefixedKey(key);
  const ttlMs = Math.max(1, ttlSeconds) * 1000;
  localCache.set(prefixedKey, {
    value: JSON.stringify(data),
    expiresAt: Date.now() + ttlMs,
  });
  pruneLocalCache();
}

function localCacheInvalidate(key: string) {
  localCache.delete(getPrefixedKey(key));
}

function localCacheInvalidatePattern(pattern: string) {
  const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wildcardRegex = new RegExp(
    `^${getPrefixedKey("").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${escapedPattern.replace(/\\\*/g, ".*")}$`,
  );

  for (const cacheKey of localCache.keys()) {
    if (wildcardRegex.test(cacheKey)) {
      localCache.delete(cacheKey);
    }
  }
}

/**
 * Simple Redis cache helper.
 * Only works when Redis is available (USE_QUEUE=true).
 * Returns null on cache miss or when Redis is unavailable.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!USE_QUEUE) {
    return localCacheGet<T>(key);
  }

  try {
    const redis = getRedisConnection();
    const cached = await redis.get(getPrefixedKey(key));
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    logger.warn({ err, key }, "Cache get failed");
  }

  return localCacheGet<T>(key);
}

/**
 * Store a value in Redis cache with a TTL.
 */
export async function cacheSet(
  key: string,
  data: unknown,
  ttlSeconds: number = 60,
): Promise<void> {
  if (!USE_QUEUE) {
    localCacheSet(key, data, ttlSeconds);
    return;
  }

  try {
    const redis = getRedisConnection();
    await redis.set(getPrefixedKey(key), JSON.stringify(data), "EX", ttlSeconds);
  } catch (err) {
    logger.warn({ err, key }, "Cache set failed");
    localCacheSet(key, data, ttlSeconds);
  }
}

/**
 * Invalidate a cache key.
 */
export async function cacheInvalidate(key: string): Promise<void> {
  localCacheInvalidate(key);
  if (!USE_QUEUE) return;

  try {
    const redis = getRedisConnection();
    await redis.del(getPrefixedKey(key));
  } catch (err) {
    logger.warn({ err, key }, "Cache invalidate failed");
  }
}

/**
 * Invalidate all keys matching a pattern (e.g. "deals:*").
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  localCacheInvalidatePattern(pattern);
  if (!USE_QUEUE) return;

  try {
    const redis = getRedisConnection();
    const keys = await redis.keys(getPrefixedKey(pattern));
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (err) {
    logger.warn({ err, pattern }, "Cache invalidate pattern failed");
  }
}
