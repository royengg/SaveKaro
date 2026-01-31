import { Context, Next } from "hono";
import { RateLimiterMemory } from "rate-limiter-flexible";

// Rate limiter for general API calls
const generalLimiter = new RateLimiterMemory({
  points: 100, // 100 requests
  duration: 60, // per 60 seconds
});

// Stricter rate limiter for auth endpoints
const authLimiter = new RateLimiterMemory({
  points: 10, // 10 requests
  duration: 60, // per 60 seconds
});

// Rate limiter for deal submissions
const submitLimiter = new RateLimiterMemory({
  points: 5, // 5 submissions
  duration: 3600, // per hour
});

export function createRateLimiter(type: "general" | "auth" | "submit" = "general") {
  const limiter = type === "auth" ? authLimiter : type === "submit" ? submitLimiter : generalLimiter;

  return async (c: Context, next: Next) => {
    const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
    
    try {
      await limiter.consume(ip);
      await next();
    } catch {
      return c.json(
        {
          success: false,
          error: "Too many requests, please try again later",
        },
        429
      );
    }
  };
}

// Convenience exports
export const rateLimiter = createRateLimiter("general");
export const authRateLimiter = createRateLimiter("auth");
export const submitRateLimiter = createRateLimiter("submit");
