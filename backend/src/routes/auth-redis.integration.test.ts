import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import { randomUUID } from "node:crypto";
import { isAbsolute } from "node:path";
import Redis from "ioredis";
import type { MiddlewareHandler } from "hono";

// Opt in with a dedicated Unix socket. Never use a production Redis URL.
const socket = process.env.AUTH_TEST_REDIS_SOCKET;
if (socket && !isAbsolute(socket))
  throw new Error(
    "AUTH_TEST_REDIS_SOCKET must be an absolute Unix socket path",
  );
process.env.USE_QUEUE = "true";
process.env.NODE_ENV = "test";
let redis: Redis | undefined;
const keys = new Set<string>();
const originalFetch = globalThis.fetch;
const user = {
  id: "redis-integration-user",
  email: "redis@example.test",
  name: "Redis test",
  avatarUrl: null,
  isAdmin: false,
};
const passThrough: MiddlewareHandler = async (_context, next) => {
  await next();
};

mock.module("../lib/redis", () => ({
  getRedisConnection: () => {
    if (!redis) throw new Error("Dedicated test Redis is not connected");
    return redis;
  },
}));
mock.module("../lib/prisma", () => ({
  default: {
    user: {
      findUnique: async () => user,
      update: async () => user,
    },
  },
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
mock.module("arctic", () => ({
  Google: class {
    async validateAuthorizationCode() {
      return { accessToken: () => "test-provider-token" };
    }
  },
}));
const { default: auth } = await import("./auth");
const { generateRefreshToken, verifyRefreshToken, verifyAccessToken } =
  await import("../lib/jwt");

function refreshToken(response: Response) {
  const token = response.headers
    .get("Set-Cookie")
    ?.match(/refresh_token=([^;]+)/)?.[1];
  expect(token).toBeString();
  keys.add(`revoked:${token!}`);
  return token!;
}

function refresh(token: string) {
  return auth.request("/refresh", {
    method: "POST",
    headers: { Cookie: `refresh_token=${token}` },
  });
}

function exchange(code: string) {
  return auth.request("/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

describe.skipIf(!socket)("auth with a real isolated Redis server", () => {
  beforeAll(async () => {
    redis = new Redis({
      path: socket!,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
      connectTimeout: 1500,
    });
    redis.on("error", () => {});
    await redis.connect();
  });
  beforeEach(() => {
    globalThis.fetch = mock(async (input: string | URL | Request) => {
      expect(String(input)).toBe(
        "https://www.googleapis.com/oauth2/v2/userinfo",
      );
      return Response.json({
        id: "provider-id",
        email: user.email,
        name: user.name,
        picture: null,
      });
    }) as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });
  afterAll(async () => {
    if (!redis) return;
    try {
      if (keys.size) await redis.del(...keys);
    } finally {
      await redis.quit();
    }
  });

  test("callback stores a bounded code and concurrent exchanges have one winner", async () => {
    const callback = await auth.request(
      "/google/callback?code=provider-code&state=test-state",
      {
        headers: {
          Cookie: "oauth_state=test-state; oauth_code_verifier=test-verifier",
        },
      },
    );
    const code = new URL(callback.headers.get("Location")!).searchParams.get(
      "code",
    );
    expect(code).toBeString();
    const key = `authcode:${code!}`;
    keys.add(key);
    expect(await redis!.ttl(key)).toBeGreaterThan(0);
    expect(await redis!.ttl(key)).toBeLessThanOrEqual(60);
    const results = await Promise.all(
      Array.from({ length: 30 }, () => exchange(code!)),
    );
    expect(results.filter((result) => result.status === 200)).toHaveLength(1);
    expect(results.filter((result) => result.status === 401)).toHaveLength(29);
    expect(await redis!.exists(key)).toBe(0);
    const winner = results.find((result) => result.status === 200)!;
    expect(verifyRefreshToken(refreshToken(winner))).toMatchObject({
      userId: user.id,
    });
    const body = (await winner.json()) as { data: { accessToken: string } };
    expect(verifyAccessToken(body.data.accessToken)).toMatchObject({
      userId: user.id,
    });
  });

  test("a code expired by Redis cannot be exchanged", async () => {
    const code = `expired-test-${randomUUID()}`;
    const key = `authcode:${code}`;
    keys.add(key);
    await redis!.set(key, JSON.stringify({ userId: user.id }), "EX", 60);
    await redis!.pexpire(key, 0);
    expect((await exchange(code)).status).toBe(401);
  });

  test("concurrent refreshes have one winner and its new JWT rotates immediately", async () => {
    const parent = generateRefreshToken({ userId: user.id, email: user.email });
    keys.add(`revoked:${parent}`);
    const results = await Promise.all(
      Array.from({ length: 30 }, () => refresh(parent)),
    );
    expect(results.filter((result) => result.status === 200)).toHaveLength(1);
    expect(results.filter((result) => result.status === 401)).toHaveLength(29);
    for (const loser of results.filter((result) => result.status === 401)) {
      expect(loser.headers.get("Set-Cookie")).toBeNull();
    }
    const ttl = await redis!.ttl(`revoked:${parent}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(7 * 24 * 60 * 60);
    const child = refreshToken(
      results.find((result) => result.status === 200)!,
    );
    expect(child).not.toBe(parent);
    const next = await refresh(child);
    expect(next.status).toBe(200);
    expect(refreshToken(next)).not.toBe(child);
  });

  test("logout persists revocation and is repeat-safe", async () => {
    const token = generateRefreshToken({ userId: user.id, email: user.email });
    keys.add(`revoked:${token}`);
    const logout = () =>
      auth.request("/logout", {
        method: "POST",
        headers: { Cookie: `refresh_token=${token}` },
      });
    expect((await logout()).status).toBe(200);
    expect((await logout()).status).toBe(200);
    expect(await redis!.get(`revoked:${token}`)).toBe("1");
    expect((await refresh(token)).status).toBe(401);
  });
});
