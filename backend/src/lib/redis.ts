import Redis from "ioredis";
import logger from "./logger";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Create Redis connection for BullMQ
export const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
});

redisConnection.on("connect", () => {
  logger.info("Redis connected");
});

redisConnection.on("error", (err) => {
  logger.error({ error: err }, "Redis connection error");
});

export default redisConnection;
