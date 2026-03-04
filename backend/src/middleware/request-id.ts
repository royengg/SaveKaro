import { Context, Next } from "hono";
import logger from "../lib/logger";

/**
 * Middleware that generates a unique request ID for each request.
 * Attaches it to the response headers and makes it available to the logger.
 */
export async function requestId(c: Context, next: Next) {
  const id = c.req.header("x-request-id") || crypto.randomUUID().slice(0, 8);

  c.set("requestId" as never, id);
  c.header("X-Request-Id", id);

  // Log the request
  const start = Date.now();

  await next();

  const duration = Date.now() - start;
  logger.info(
    {
      requestId: id,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration: `${duration}ms`,
    },
    "request",
  );
}
