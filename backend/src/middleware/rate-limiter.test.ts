import { test } from "node:test";
import assert from "node:assert/strict";
import { Hono } from "hono";
import { createRateLimiter, getRateLimiterStatus } from "./rate-limiter";
import { RATE_LIMITS } from "../config/constants";

test("memory limits return 429 with Retry-After", async () => {
  const app = new Hono();
  app.use("*", createRateLimiter("submit"));
  app.get("/", c => c.text("ok"));
  for (let i = 0; i < RATE_LIMITS.SUBMIT.points; i++) {
    assert.equal((await app.request("/", { headers: { "x-real-ip": "limit-fixture" } })).status, 200);
  }
  const denied = await app.request("/", { headers: { "x-real-ip": "limit-fixture" } });
  assert.equal(denied.status, 429);
  assert(Number(denied.headers.get("Retry-After")) > 0);
  assert.equal(getRateLimiterStatus().backend, "memory");
});

test("downstream errors are not misreported as rate limits", async () => {
  const app = new Hono();
  app.use("*", createRateLimiter());
  app.get("/", () => { throw new Error("application error"); });
  app.onError(() => new Response("Failed", { status: 500 }));
  assert.equal((await app.request("/")).status, 500);
});
