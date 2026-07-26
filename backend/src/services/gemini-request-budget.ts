import { GEMINI_LIMITS } from "../config/constants";
import { getRedisConnection } from "../lib/redis";

const GEMINI_QUOTA_TIMEZONE = "America/Los_Angeles";
const DAILY_REQUEST_LIMIT = GEMINI_LIMITS.TITLE_CLASSIFIER_DAILY_REQUESTS;
const REDIS_KEY_TTL_SECONDS = 3 * 24 * 60 * 60;
const USE_SHARED_BUDGET =
  process.env.USE_QUEUE === "true" && Boolean(process.env.REDIS_URL?.trim());

const RESERVE_REQUEST_LUA = `
local current = tonumber(redis.call("GET", KEYS[1]) or "0")
local limit = tonumber(ARGV[1])

if current >= limit then
  return {0, current}
end

current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[2])
end

return {1, current}
`;

let inMemoryDateKey = "";
let inMemoryRequestCount = 0;

export interface GeminiRequestBudgetResult {
  allowed: boolean;
  used: number;
  limit: number;
  reason:
    | "gemini_request_slot_reserved"
    | "gemini_daily_request_limit_reached"
    | "gemini_request_budget_unavailable";
}

function getQuotaDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: GEMINI_QUOTA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getRedisBudgetKey(): string {
  return `savekaro:gemini:title-classifier:${getQuotaDateKey()}`;
}

function reserveInMemoryRequestSlot(): GeminiRequestBudgetResult {
  const currentDateKey = getQuotaDateKey();
  if (currentDateKey !== inMemoryDateKey) {
    inMemoryDateKey = currentDateKey;
    inMemoryRequestCount = 0;
  }

  if (inMemoryRequestCount >= DAILY_REQUEST_LIMIT) {
    return {
      allowed: false,
      used: inMemoryRequestCount,
      limit: DAILY_REQUEST_LIMIT,
      reason: "gemini_daily_request_limit_reached",
    };
  }

  inMemoryRequestCount++;
  return {
    allowed: true,
    used: inMemoryRequestCount,
    limit: DAILY_REQUEST_LIMIT,
    reason: "gemini_request_slot_reserved",
  };
}

export async function reserveGeminiRequestSlot(): Promise<GeminiRequestBudgetResult> {
  if (!USE_SHARED_BUDGET) {
    return reserveInMemoryRequestSlot();
  }

  try {
    const redis = getRedisConnection();
    const response = (await redis.eval(
      RESERVE_REQUEST_LUA,
      1,
      getRedisBudgetKey(),
      DAILY_REQUEST_LIMIT,
      REDIS_KEY_TTL_SECONDS,
    )) as [number, number];
    const [allowed, used] = response.map(Number);

    return {
      allowed: allowed === 1,
      used,
      limit: DAILY_REQUEST_LIMIT,
      reason:
        allowed === 1
          ? "gemini_request_slot_reserved"
          : "gemini_daily_request_limit_reached",
    };
  } catch {
    return {
      allowed: false,
      used: DAILY_REQUEST_LIMIT,
      limit: DAILY_REQUEST_LIMIT,
      reason: "gemini_request_budget_unavailable",
    };
  }
}
