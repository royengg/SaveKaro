import Redis from "ioredis";
import logger from "./logger";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const USE_QUEUE = process.env.USE_QUEUE === "true";

// Only create Redis connection when needed (USE_QUEUE=true or explicitly requested)
let _connection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!_connection) {
    _connection = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    });

    _connection.on("connect", () => {
      logger.info("Redis connected");
    });

    _connection.on("error", (err) => {
      logger.error({ error: err }, "Redis connection error");
    });
  }
  return _connection;
}

// Eagerly connect only if queues are enabled
export const redisConnection: Redis = USE_QUEUE
  ? getRedisConnection()
  : (null as unknown as Redis);

// Helper to check if Redis is available
export async function isRedisHealthy(): Promise<boolean> {
  try {
    if (!_connection) return false;
    const result = await _connection.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}

export default redisConnection;
