import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import type { MiddlewareHandler } from "hono";

process.env.USE_QUEUE = "false";
process.env.NODE_ENV = "test";
const user = {
  id: "memory-user",
  email: "memory@example.test",
  name: "Memory test user",
  avatarUrl: null,
  isAdmin: false,
};
let accountExists = true;
const originalFetch = globalThis.fetch;
const originalNow = Date.now;
const passThrough: MiddlewareHandler = async (_context, next) => {
  await next();
};

mock.module("../lib/prisma", () => ({
  default: {
    user: {
      findUnique: async () => (accountExists ? user : null),
      update: async () => user,
    },
  },
}));
mock.module("../lib/redis", () => ({
  getRedisConnection: () => {
    throw new Error("In-memory auth must not access Redis");
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
const { generateRefreshToken } = await import("../lib/jwt");

beforeEach(() => {
  accountExists = true;
  globalThis.fetch = mock(async (input: string | URL | Request) => {
    expect(String(input)).toBe("https://www.googleapis.com/oauth2/v2/userinfo");
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
  Date.now = originalNow;
});

async function issueCode() {
  const response = await auth.request(
    "/google/callback?code=provider-code&state=test-state",
    {
      headers: {
        Cookie: "oauth_state=test-state; oauth_code_verifier=test-verifier",
      },
    },
  );
  expect(response.status).toBe(302);
  const code = new URL(response.headers.get("Location")!).searchParams.get(
    "code",
  );
  expect(code).toBeString();
  return code!;
}

function exchange(code: string) {
  return auth.request("/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

function refresh(token: string) {
  return auth.request("/refresh", {
    method: "POST",
    headers: { Cookie: `refresh_token=${token}` },
  });
}

test("in-memory auth codes have one winner under concurrent exchange", async () => {
  const code = await issueCode();
  const results = await Promise.all(
    Array.from({ length: 20 }, () => exchange(code)),
  );
  expect(results.filter((response) => response.status === 200)).toHaveLength(1);
  expect(results.filter((response) => response.status === 401)).toHaveLength(
    19,
  );
});

test("in-memory auth codes expire without waiting for interval cleanup", async () => {
  const clock = spyOn(Date, "now").mockReturnValue(originalNow());
  const issuedAt = Date.now();
  const code = await issueCode();
  clock.mockReturnValue(issuedAt + 60_001);
  expect((await exchange(code)).status).toBe(401);
});

test("in-memory refresh claims reject concurrent parent reuse", async () => {
  const parent = generateRefreshToken({ userId: user.id, email: user.email });
  const results = await Promise.all(
    Array.from({ length: 20 }, () => refresh(parent)),
  );
  expect(results.filter((response) => response.status === 200)).toHaveLength(1);
  expect(results.filter((response) => response.status === 401)).toHaveLength(
    19,
  );
});

test("in-memory logout is idempotent and prevents later refresh", async () => {
  const parent = generateRefreshToken({ userId: user.id, email: user.email });
  const logout = () =>
    auth.request("/logout", {
      method: "POST",
      headers: { Cookie: `refresh_token=${parent}` },
    });
  expect((await logout()).status).toBe(200);
  expect((await logout()).status).toBe(200);
  expect((await refresh(parent)).status).toBe(401);
});

test("a deleted account cannot exchange an in-memory auth code", async () => {
  const code = await issueCode();
  accountExists = false;
  expect((await exchange(code)).status).toBe(401);
});
