import { getRedisConnection, shouldUseRedisCache } from "./redis";
import logger from "./logger";

const USE_REDIS_CACHE = shouldUseRedisCache();
const LOCAL_CACHE_MAX_KEYS = Math.max(
  200,
  parseInt(process.env.LOCAL_CACHE_MAX_KEYS || "1200", 10) || 1200,
);
const NAMESPACE_VERSION_TTL_MS = Math.max(
  250,
  parseInt(process.env.CACHE_NAMESPACE_VERSION_TTL_MS || "2000", 10) || 2000,
);
const NAMESPACE_VERSION_RETRY_MS = Math.max(
  NAMESPACE_VERSION_TTL_MS,
  parseInt(process.env.CACHE_NAMESPACE_VERSION_RETRY_MS || "5000", 10) || 5000,
);
const VERSIONED_NAMESPACES = new Set(["deals", "leaderboard"]);

interface LocalCacheEntry {
  value: string;
  expiresAt: number;
}

const localCache = new Map<string, LocalCacheEntry>();
const cacheLoadsInFlight = new Map<string, Promise<unknown>>();
const invalidationVersions = new Map<string, number>();
const namespaceVersions = new Map<
  string,
  { value: number; refreshAfter: number }
>();
const namespaceRefreshesInFlight = new Map<string, Promise<number>>();

interface InvalidationSnapshot {
  targets: string[];
  versions: number[];
  redisVerified: boolean;
}

function getPrefixedKey(key: string): string {
  return `cache:${key}`;
}

function getVersionKey(namespace: string): string {
  return getPrefixedKey(`${namespace}:version`);
}

function getInvalidationVersionKey(target: string): string {
  return getPrefixedKey(`invalidation:${target}`);
}

function getInvalidationTargets(key: string): string[] {
  const parts = key.split(":");
  const targets: string[] = [];

  for (let index = 1; index <= parts.length; index++) {
    targets.push(parts.slice(0, index).join(":"));
  }

  return targets;
}

function getPatternInvalidationTarget(pattern: string): string {
  const wildcardIndex = pattern.indexOf("*");
  const prefix = wildcardIndex >= 0 ? pattern.slice(0, wildcardIndex) : pattern;
  return prefix.endsWith(":") ? prefix.slice(0, -1) : prefix;
}

function incrementLocalInvalidationVersion(target: string): number {
  const nextVersion = (invalidationVersions.get(target) ?? 0) + 1;
  invalidationVersions.set(target, nextVersion);
  return nextVersion;
}

function getVersionedNamespace(key: string): string | null {
  const separatorIndex = key.indexOf(":");
  if (separatorIndex <= 0) {
    return null;
  }

  const namespace = key.slice(0, separatorIndex);
  return VERSIONED_NAMESPACES.has(namespace) ? namespace : null;
}

async function getNamespaceVersion(namespace: string): Promise<number> {
  const cached = namespaceVersions.get(namespace);
  if (cached && cached.refreshAfter > Date.now()) {
    return cached.value;
  }

  if (!USE_REDIS_CACHE) {
    const value = cached?.value ?? 0;
    namespaceVersions.set(namespace, {
      value,
      refreshAfter: Number.POSITIVE_INFINITY,
    });
    return value;
  }

  const existingRefresh = namespaceRefreshesInFlight.get(namespace);
  if (existingRefresh) return existingRefresh;

  const refresh = (async () => {
    try {
      const localFloor = namespaceVersions.get(namespace)?.value ?? 0;
      const storedVersion = await getRedisConnection().eval(
        `
          local current = tonumber(redis.call("get", KEYS[1]) or "0")
          local floor = tonumber(ARGV[1])
          if current < floor then
            redis.call("set", KEYS[1], floor)
            return floor
          end
          return current
        `,
        1,
        getVersionKey(namespace),
        String(localFloor),
      );
      const value = Math.max(
        namespaceVersions.get(namespace)?.value ?? 0,
        Number(storedVersion) || 0,
      );
      namespaceVersions.set(namespace, {
        value,
        refreshAfter: Date.now() + NAMESPACE_VERSION_TTL_MS,
      });
      return value;
    } catch (err) {
      const value = namespaceVersions.get(namespace)?.value ?? 0;
      namespaceVersions.set(namespace, {
        value,
        refreshAfter: Date.now() + NAMESPACE_VERSION_RETRY_MS,
      });
      logger.warn({ err, namespace }, "Cache namespace version read failed");
      return value;
    }
  })().finally(() => {
    namespaceRefreshesInFlight.delete(namespace);
  });

  namespaceRefreshesInFlight.set(namespace, refresh);
  return refresh;
}

async function getStorageKey(key: string): Promise<string> {
  const namespace = getVersionedNamespace(key);
  if (!namespace) {
    return getPrefixedKey(key);
  }

  const version = await getNamespaceVersion(namespace);
  const namespaceKey = key.slice(namespace.length + 1);
  return getPrefixedKey(`${namespace}:v${version}:${namespaceKey}`);
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

function localCacheGet<T>(storageKey: string): T | null {
  const entry = localCache.get(storageKey);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    localCache.delete(storageKey);
    return null;
  }

  try {
    return JSON.parse(entry.value) as T;
  } catch {
    localCache.delete(storageKey);
    return null;
  }
}

function localCacheSet(storageKey: string, data: unknown, ttlSeconds: number) {
  const ttlMs = Math.max(1, ttlSeconds) * 1000;
  localCache.set(storageKey, {
    value: JSON.stringify(data),
    expiresAt: Date.now() + ttlMs,
  });
  pruneLocalCache();
}

function localCacheInvalidate(storageKey: string) {
  localCache.delete(storageKey);
}

function localCacheInvalidatePattern(pattern: string) {
  const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wildcardRegex = new RegExp(`^${escapedPattern.replace(/\\\*/g, ".*")}$`);

  for (const cacheKey of localCache.keys()) {
    const logicalKey = cacheKey.slice(getPrefixedKey("").length);
    const versionedMatch = logicalKey.match(/^([^:]+):v\d+:(.*)$/);
    const comparableKey =
      versionedMatch && VERSIONED_NAMESPACES.has(versionedMatch[1])
        ? `${versionedMatch[1]}:${versionedMatch[2]}`
        : logicalKey;

    if (wildcardRegex.test(comparableKey)) {
      localCache.delete(cacheKey);
    }
  }
}

async function cacheGetFromStorageKey<T>(
  storageKey: string,
  logicalKey: string,
): Promise<T | null> {
  const localValue = localCacheGet<T>(storageKey);
  if (localValue !== null) {
    return localValue;
  }

  if (!USE_REDIS_CACHE) return null;

  try {
    const redis = getRedisConnection();
    const results = await redis
      .pipeline()
      .get(storageKey)
      .ttl(storageKey)
      .exec();
    const [getError, cached] = results?.[0] ?? [];
    const [ttlError, ttl] = results?.[1] ?? [];

    if (getError) throw getError;
    if (ttlError) throw ttlError;

    if (typeof cached === "string") {
      const parsed = JSON.parse(cached) as T;
      const ttlSeconds = typeof ttl === "number" ? ttl : Number(ttl);
      if (ttlSeconds > 0) {
        localCacheSet(storageKey, parsed, ttlSeconds);
      }
      return parsed;
    }
  } catch (err) {
    logger.warn({ err, key: logicalKey }, "Cache get failed");
  }

  return null;
}

async function captureInvalidationSnapshot(
  key: string,
): Promise<InvalidationSnapshot> {
  const targets = getInvalidationTargets(key);
  const localVersions = targets.map(
    (target) => invalidationVersions.get(target) ?? 0,
  );

  if (!USE_REDIS_CACHE) {
    return { targets, versions: localVersions, redisVerified: false };
  }

  try {
    const storedVersions = await getRedisConnection().eval(
      `
        local versions = {}
        for index = 1, #KEYS do
          local current = tonumber(redis.call("get", KEYS[index]) or "0")
          local floor = tonumber(ARGV[index])
          if current < floor then
            current = floor
            redis.call("set", KEYS[index], current)
          end
          versions[index] = current
        end
        return versions
      `,
      targets.length,
      ...targets.map(getInvalidationVersionKey),
      ...localVersions.map(String),
    );
    if (!Array.isArray(storedVersions)) {
      throw new Error("Invalid cache invalidation version response");
    }
    const versions = storedVersions.map((value) =>
      Math.max(0, Number(value) || 0),
    );
    targets.forEach((target, index) => {
      invalidationVersions.set(
        target,
        Math.max(invalidationVersions.get(target) ?? 0, versions[index]),
      );
    });
    return { targets, versions, redisVerified: true };
  } catch (err) {
    logger.warn({ err, key }, "Cache invalidation version read failed");
    return { targets, versions: localVersions, redisVerified: false };
  }
}

function isLocalSnapshotCurrent(snapshot: InvalidationSnapshot): boolean {
  return snapshot.targets.every(
    (target, index) =>
      (invalidationVersions.get(target) ?? 0) === snapshot.versions[index],
  );
}

async function cacheSetIfSnapshotCurrent(
  storageKey: string,
  key: string,
  data: unknown,
  ttlSeconds: number,
  snapshot: InvalidationSnapshot,
): Promise<void> {
  if (!isLocalSnapshotCurrent(snapshot)) return;

  if (!USE_REDIS_CACHE) {
    localCacheSet(storageKey, data, ttlSeconds);
    return;
  }

  if (!snapshot.redisVerified) return;

  const invalidationKeys = snapshot.targets.map(getInvalidationVersionKey);
  const serialized = JSON.stringify(data);
  const script = `
    local versionCount = #KEYS - 1
    for index = 1, versionCount do
      local current = redis.call("get", KEYS[index]) or "0"
      if current ~= ARGV[index] then return 0 end
    end
    redis.call("set", KEYS[#KEYS], ARGV[versionCount + 1], "EX", ARGV[versionCount + 2])
    return 1
  `;

  try {
    const result = await getRedisConnection().eval(
      script,
      invalidationKeys.length + 1,
      ...invalidationKeys,
      storageKey,
      ...snapshot.versions.map(String),
      serialized,
      String(Math.max(1, ttlSeconds)),
    );

    if (result === 1 && isLocalSnapshotCurrent(snapshot)) {
      localCacheSet(storageKey, data, ttlSeconds);
    }
  } catch (err) {
    logger.warn({ err, key }, "Conditional cache set failed");
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const storageKey = await getStorageKey(key);
  return cacheGetFromStorageKey<T>(storageKey, key);
}

export async function cacheGetOrSet<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<T> {
  const storageKey = await getStorageKey(key);
  const cached = await cacheGetFromStorageKey<T>(storageKey, key);
  if (cached !== null) {
    return cached;
  }

  const snapshot = await captureInvalidationSnapshot(key);
  const flightKey = `${storageKey}|${snapshot.versions.join(":")}`;
  const existingLoad = cacheLoadsInFlight.get(flightKey) as
    | Promise<T>
    | undefined;
  if (existingLoad) {
    return existingLoad;
  }

  const pendingLoad = load()
    .then(async (data) => {
      await cacheSetIfSnapshotCurrent(
        storageKey,
        key,
        data,
        ttlSeconds,
        snapshot,
      );
      return data;
    })
    .finally(() => {
      cacheLoadsInFlight.delete(flightKey);
    });

  cacheLoadsInFlight.set(flightKey, pendingLoad);
  return pendingLoad;
}

export async function cacheSet(
  key: string,
  data: unknown,
  ttlSeconds: number = 60,
): Promise<void> {
  const storageKey = await getStorageKey(key);
  localCacheSet(storageKey, data, ttlSeconds);

  if (!USE_REDIS_CACHE) return;

  try {
    const redis = getRedisConnection();
    await redis.set(
      storageKey,
      JSON.stringify(data),
      "EX",
      ttlSeconds,
    );
  } catch (err) {
    logger.warn({ err, key }, "Cache set failed");
  }
}

export async function cacheInvalidate(key: string): Promise<void> {
  const invalidationTarget = key;
  incrementLocalInvalidationVersion(invalidationTarget);
  const storageKey = await getStorageKey(key);
  localCacheInvalidate(storageKey);
  if (!USE_REDIS_CACHE) return;

  try {
    const redis = getRedisConnection();
    const results = await redis
      .pipeline()
      .incr(getInvalidationVersionKey(invalidationTarget))
      .del(storageKey)
      .exec();
    const commandError = results?.find(([error]) => error)?.[0];
    if (!results || commandError) throw commandError;
  } catch (err) {
    logger.warn({ err, key }, "Cache invalidate failed");
  }
}

export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  const namespaceMatch = pattern.match(/^([^:*]+):\*$/);
  const namespace = namespaceMatch?.[1];

  if (namespace && VERSIONED_NAMESPACES.has(namespace)) {
    const currentVersion = namespaceVersions.get(namespace)?.value ?? 0;

    if (!USE_REDIS_CACHE) {
      namespaceVersions.set(namespace, {
        value: currentVersion + 1,
        refreshAfter: Number.POSITIVE_INFINITY,
      });
      return;
    }

    try {
      const storedVersion = await getRedisConnection().eval(
        `
          local current = tonumber(redis.call("get", KEYS[1]) or "0")
          local floor = tonumber(ARGV[1])
          local next = math.max(current, floor) + 1
          redis.call("set", KEYS[1], next)
          return next
        `,
        1,
        getVersionKey(namespace),
        String(currentVersion),
      );
      const value = Math.max(
        namespaceVersions.get(namespace)?.value ?? 0,
        currentVersion + 1,
        Number(storedVersion) || 0,
      );
      namespaceVersions.set(namespace, {
        value,
        refreshAfter: Date.now() + NAMESPACE_VERSION_TTL_MS,
      });
      return;
    } catch (err) {
      const value = Math.max(
        namespaceVersions.get(namespace)?.value ?? 0,
        currentVersion,
      ) + 1;
      namespaceVersions.set(namespace, {
        value,
        refreshAfter: Date.now() + NAMESPACE_VERSION_RETRY_MS,
      });
      logger.warn({ err, namespace }, "Cache namespace invalidation failed");
      return;
    }
  }

  const invalidationTarget = getPatternInvalidationTarget(pattern);
  if (invalidationTarget) {
    incrementLocalInvalidationVersion(invalidationTarget);
  }
  localCacheInvalidatePattern(pattern);
  if (!USE_REDIS_CACHE) return;

  try {
    const redis = getRedisConnection();
    if (invalidationTarget) {
      await redis.incr(getInvalidationVersionKey(invalidationTarget));
    }
    const separatorIndex = pattern.indexOf(":");
    const patternNamespace =
      separatorIndex > 0 ? pattern.slice(0, separatorIndex) : null;
    const redisPattern =
      patternNamespace && VERSIONED_NAMESPACES.has(patternNamespace)
        ? getPrefixedKey(
            `${patternNamespace}:v*:${pattern.slice(separatorIndex + 1)}`,
          )
        : getPrefixedKey(pattern);
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        redisPattern,
        "COUNT",
        200,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch (err) {
    logger.warn({ err, pattern }, "Cache invalidate pattern failed");
  }
}
