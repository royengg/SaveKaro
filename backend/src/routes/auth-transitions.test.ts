import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { MiddlewareHandler } from "hono";

// Exercise the real Hono routes with an isolated Redis model, never a live service.
process.env.USE_QUEUE = "true";
process.env.NODE_ENV = "test";

const user = {
  id: "transition-user",
  email: "transitions@example.test",
  name: "Test user",
  avatarUrl: null,
  isAdmin: false,
};
const values = new Map<string, string>();
const readRaces = new Map<
  string,
  { ready: Promise<void>; arrive: () => void }
>();
let issuedTokens = 0;
let existingUser: typeof user | null = user;
let redisAvailable = true;

function raceTwoReads(key: string) {
  let arrivals = 0;
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  readRaces.set(key, {
    ready,
    arrive: () => {
      if (++arrivals === 2) release();
    },
  });
}

const redis = {
  async get(key: string) {
    // Capture each read before either caller is allowed to delete/revoke.
    const snapshot = values.get(key) ?? null;
    const race = readRaces.get(key);
    if (race) {
      race.arrive();
      await race.ready;
    }
    return snapshot;
  },
  async set(key: string, value: string, ...options: (string | number)[]) {
    if (!redisAvailable) throw new Error("Redis unavailable");
    if (options.includes("NX") && values.has(key)) return null;
    values.set(key, value);
    return "OK";
  },
  async del(key: string) {
    return Number(values.delete(key));
  },
  async eval(_script: string, _keyCount: number, key: string) {
    if (!redisAvailable) throw new Error("Redis unavailable");
    const value = values.get(key) ?? null;
    values.delete(key);
    return value;
  },
};
const passThrough: MiddlewareHandler = async (_context, next) => {
  await next();
};
mock.module("../lib/redis", () => ({ getRedisConnection: () => redis }));
mock.module("../lib/prisma", () => ({
  default: {
    user: { findUnique: async () => existingUser },
  },
}));
mock.module("../lib/jwt", () => ({
  generateAccessToken: () => "test-access-token",
  generateRefreshToken: () => `test-refresh-token-${++issuedTokens}`,
  verifyRefreshToken: (token: string) =>
    token === "invalid" ? null : { userId: user.id, email: user.email },
}));
mock.module("../middleware/rate-limiter", () => ({
  authRateLimiter: passThrough,
  oauthRateLimiter: passThrough,
}));
mock.module("../lib/logger", () => ({ default: { warn() {}, error() {} } }));
mock.module("../lib/posthog", () => ({ captureServerEvent() {} }));
mock.module("../services/notification/welcome", () => ({
  ensureWelcomeNotification: async () => {},
}));
const { default: auth } = await import("./auth");

function exchange(code: string) {
  return auth.request("/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

function refresh(token = "parent") {
  return auth.request("/refresh", {
    method: "POST",
    headers: { Cookie: `refresh_token=${token}` },
  });
}

beforeEach(() => {
  values.clear();
  readRaces.clear();
  issuedTokens = 0;
  existingUser = user;
  redisAvailable = true;
});

describe("web one-time auth code", () => {
  test("a consumed code cannot be exchanged again sequentially", async () => {
    values.set("authcode:issued", JSON.stringify({ userId: user.id }));
    expect((await exchange("issued")).status).toBe(200);
    expect((await exchange("issued")).status).toBe(401);
    expect(issuedTokens).toBe(1);
  });

  test("missing or unknown codes never issue tokens", async () => {
    expect((await exchange("")).status).toBe(400);
    expect((await exchange("unknown")).status).toBe(401);
    expect(issuedTokens).toBe(0);
  });

  test("a deleted account cannot exchange an otherwise valid code", async () => {
    values.set("authcode:issued", JSON.stringify({ userId: user.id }));
    existingUser = null;
    expect((await exchange("issued")).status).toBe(401);
    expect(values.has("authcode:issued")).toBe(false);
    expect(issuedTokens).toBe(0);
  });

  test("[regression] concurrent exchanges must have exactly one winner", async () => {
    values.set("authcode:shared", JSON.stringify({ userId: user.id }));
    raceTwoReads("authcode:shared");
    const results = await Promise.all([exchange("shared"), exchange("shared")]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 401]);
    expect(issuedTokens).toBe(1);
  });

  test("a Redis failure never consumes a code using process-local fallback", async () => {
    values.set("authcode:issued", JSON.stringify({ userId: user.id }));
    redisAvailable = false;
    expect((await exchange("issued")).status).toBe(503);
    expect(issuedTokens).toBe(0);
    redisAvailable = true;
    expect((await exchange("issued")).status).toBe(200);
  });
});

describe("web refresh rotation", () => {
  test("rotation revokes the parent and accepts its replacement", async () => {
    const first = await refresh();
    expect(first.status).toBe(200);
    expect(first.headers.get("Set-Cookie")).toContain(
      "refresh_token=test-refresh-token-1",
    );
    expect((await refresh()).status).toBe(401);
    expect((await refresh("test-refresh-token-1")).status).toBe(200);
  });

  test("invalid tokens and missing users do not issue replacements", async () => {
    expect((await refresh("invalid")).status).toBe(401);
    existingUser = null;
    expect((await refresh()).status).toBe(401);
    expect(issuedTokens).toBe(0);
  });

  test("logout revokes the parent even before its first refresh", async () => {
    const result = await auth.request("/logout", {
      method: "POST",
      headers: { Cookie: "refresh_token=parent" },
    });
    expect(result.status).toBe(200);
    expect((await refresh()).status).toBe(401);
    expect(issuedTokens).toBe(0);
  });

  test("[regression] two concurrent refreshes must not both rotate one parent", async () => {
    raceTwoReads("revoked:parent");
    const results = await Promise.all([refresh(), refresh()]);
    expect(results.map((result) => result.status).sort()).toEqual([200, 401]);
    expect(issuedTokens).toBe(1);
    const loser = results.find((result) => result.status === 401)!;
    expect(loser.headers.get("Set-Cookie")).toBeNull();
  });

  test("a Redis failure cannot issue a replacement using a local claim", async () => {
    redisAvailable = false;
    const result = await refresh();
    expect(result.status).toBe(503);
    expect(result.headers.get("Set-Cookie")).toBeNull();
    expect(issuedTokens).toBe(0);
    redisAvailable = true;
    expect((await refresh()).status).toBe(200);
  });

  test("failed logout revocation reports failure and still removes the cookie", async () => {
    redisAvailable = false;
    const result = await auth.request("/logout", {
      method: "POST",
      headers: { Cookie: "refresh_token=parent" },
    });
    expect(result.status).toBe(503);
    expect(result.headers.get("Set-Cookie")).toContain("Max-Age=0");
  });
});
