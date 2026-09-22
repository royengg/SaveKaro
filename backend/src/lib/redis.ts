import Redis from "ioredis";
import logger from "./logger";

const CONFIGURED_REDIS_URL = process.env.REDIS_URL?.trim() || null;
const REDIS_URL = CONFIGURED_REDIS_URL || "redis://localhost:6379";
const USE_QUEUE = process.env.USE_QUEUE === "true";
const USE_REDIS_CACHE = process.env.USE_REDIS_CACHE !== "false";
const REDIS_ERROR_LOG_INTERVAL_MS = 30_000;

let _connection: Redis | null = null;
let _workerConnection: Redis | null = null;

function attachConnectionLogging(connection: Redis, role: "commands" | "workers") {
  let lastErrorLoggedAt = 0;

  connection.on("connect", () => {
    lastErrorLoggedAt = 0;
    logger.info({ role }, "Redis connected");
  });

  connection.on("error", (err) => {
    const now = Date.now();
    if (now - lastErrorLoggedAt < REDIS_ERROR_LOG_INTERVAL_MS) return;
    lastErrorLoggedAt = now;
    logger.error({ error: err, role }, "Redis connection error");
  });
}

export function getRedisConnection(): Redis {
  if (!_connection) {
    _connection = new Redis(REDIS_URL, {
      connectTimeout: 1500,
      commandTimeout: 1500,
      enableOfflineQueue: false,
      enableReadyCheck: false,
      maxRetriesPerRequest: 1,
    });
    attachConnectionLogging(_connection, "commands");
  }
  return _connection;
}

/**
 * BullMQ workers use blocking Redis commands and require unlimited request
 * retries. Never use this connection on an HTTP request path.
 */
export function getRedisWorkerConnection(): Redis {
  if (!_workerConnection) {
    _workerConnection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    attachConnectionLogging(_workerConnection, "workers");
  }
  return _workerConnection;
}

export function isRedisConfigured(): boolean {
  return Boolean(CONFIGURED_REDIS_URL);
}

export function shouldUseRedisCache(): boolean {
  return USE_REDIS_CACHE && isRedisConfigured();
}

export const redisConnection: Redis = USE_QUEUE
  ? getRedisConnection()
  : (null as unknown as Redis);

export async function isRedisHealthy(): Promise<boolean> {
  try {
    const result = await getRedisConnection().ping();
    return result === "PONG";
  } catch {
    return false;
  }
}

export default redisConnection;
