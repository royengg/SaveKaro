import { afterEach, beforeEach, expect, mock, test } from "bun:test";

mock.module("@/lib/analytics/posthog", () => ({
  getAnalyticsRequestHeaders: () => ({}),
}));
const { default: api } = await import("./api");
const originalFetch = globalThis.fetch;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function session(token = "fresh") {
  return Response.json({
    success: true,
    data: { accessToken: token, expiresIn: 900 },
  });
}

beforeEach(() => {
  api.setAccessToken(null);
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("logout waits for earlier cookie-setting responses and discards their access tokens", async () => {
  const refreshReply = deferred<Response>();
  const refreshStarted = deferred<void>();
  const logoutStarted = deferred<void>();
  const paths: string[] = [];
  globalThis.fetch = mock(async (input: string | URL | Request) => {
    const path = new URL(String(input), "http://test.local").pathname;
    paths.push(path);
    if (path === "/api/auth/refresh") {
      refreshStarted.resolve();
      return refreshReply.promise;
    }
    if (path === "/api/auth/logout") {
      logoutStarted.resolve();
      return Response.json({ success: true });
    }
    throw new Error(`Unexpected request ${path}`);
  }) as unknown as typeof fetch;
  const refresh = api.refreshAccessToken();
  await refreshStarted.promise;
  const logout = api.logout();
  expect(api.getAccessToken()).toBeNull();
  expect(paths).toEqual(["/api/auth/refresh"]);
  refreshReply.resolve(session("late-token"));
  await logoutStarted.promise;
  expect(await refresh).toBeNull();
  await logout;
  expect(paths).toEqual(["/api/auth/refresh", "/api/auth/logout"]);
  expect(api.getAccessToken()).toBeNull();
});

test("a late exchange cannot install an access token after logout", async () => {
  const reply = deferred<Response>();
  const started = deferred<void>();
  globalThis.fetch = mock(async (input: string | URL | Request) => {
    if (String(input).endsWith("/token")) {
      started.resolve();
      return reply.promise;
    }
    return Response.json({ success: true });
  }) as unknown as typeof fetch;
  const exchange = api.exchangeCode("code").catch((error: unknown) => error);
  await started.promise;
  const logout = api.logout();
  reply.resolve(session("late-token"));
  expect(await exchange).toMatchObject({ name: "AbortError" });
  await logout;
  expect(api.getAccessToken()).toBeNull();
});

test("new login waits for pending logout rather than racing its cookie deletion", async () => {
  const reply = deferred<Response>();
  const started = deferred<void>();
  const paths: string[] = [];
  globalThis.fetch = mock(async (input: string | URL | Request) => {
    const path = new URL(String(input), "http://test.local").pathname;
    paths.push(path);
    if (path === "/api/auth/logout") {
      started.resolve();
      return reply.promise;
    }
    return session("new-login");
  }) as unknown as typeof fetch;
  const logout = api.logout();
  await started.promise;
  const login = api.exchangeCode("new-code");
  expect(paths).toEqual(["/api/auth/logout"]);
  reply.resolve(Response.json({ success: true }));
  await Promise.all([logout, login]);
  expect(paths).toEqual(["/api/auth/logout", "/api/auth/token"]);
  expect(api.getAccessToken()).toBe("new-login");
});

test("a stale refresh failure cannot clear a newer login's token", async () => {
  const reply = deferred<Response>();
  const started = deferred<void>();
  globalThis.fetch = mock(async (input: string | URL | Request) => {
    if (String(input).endsWith("/refresh")) {
      started.resolve();
      return reply.promise;
    }
    return session("new-login");
  }) as unknown as typeof fetch;
  const refresh = api.refreshAccessToken();
  await started.promise;
  const login = api.exchangeCode("new-code");
  reply.reject(new Error("old request failed"));
  expect(await refresh).toBeNull();
  await login;
  expect(api.getAccessToken()).toBe("new-login");
});

test("a pre-logout authenticated request cannot refresh or replay after logout", async () => {
  const reply = deferred<Response>();
  const started = deferred<void>();
  const paths: string[] = [];
  api.setAccessToken("old-token");
  globalThis.fetch = mock(async (input: string | URL | Request) => {
    const path = new URL(String(input), "http://test.local").pathname;
    paths.push(path);
    if (path === "/api/private") {
      started.resolve();
      return reply.promise;
    }
    if (path === "/api/auth/logout") return Response.json({ success: true });
    throw new Error(`Unexpected request ${path}`);
  }) as unknown as typeof fetch;
  const request = api.request("/api/private").catch((error: unknown) => error);
  await started.promise;
  await api.logout();
  reply.resolve(Response.json({ error: "expired" }, { status: 401 }));
  expect(await request).toMatchObject({ status: 401 });
  expect(paths).toEqual(["/api/private", "/api/auth/logout"]);
});

test("a stale refresh cannot clear a newer single-flight request", async () => {
  const oldReply = deferred<Response>();
  const newReply = deferred<Response>();
  const oldStarted = deferred<void>();
  const newStarted = deferred<void>();
  let requests = 0;
  globalThis.fetch = mock(async () => {
    if (++requests === 1) {
      oldStarted.resolve();
      return oldReply.promise;
    }
    newStarted.resolve();
    return newReply.promise;
  }) as unknown as typeof fetch;
  const oldRefresh = api.refreshAccessToken();
  await oldStarted.promise;
  api.setAccessToken(null);
  const current = api.refreshAccessToken();
  oldReply.resolve(session("stale"));
  expect(await oldRefresh).toBeNull();
  await newStarted.promise;
  const joined = api.refreshAccessToken();
  newReply.resolve(session("current"));
  await Promise.all([current, joined]);
  expect(requests).toBe(2);
  expect(api.getAccessToken()).toBe("current");
});

test("refresh waits for an earlier login response before using its cookie", async () => {
  const reply = deferred<Response>();
  const started = deferred<void>();
  const paths: string[] = [];
  globalThis.fetch = mock(async (input: string | URL | Request) => {
    const path = new URL(String(input), "http://test.local").pathname;
    paths.push(path);
    if (path.endsWith("/token")) {
      started.resolve();
      return reply.promise;
    }
    return session("refreshed-login");
  }) as unknown as typeof fetch;
  const login = api.exchangeCode("code");
  await started.promise;
  const refresh = api.refreshAccessToken();
  expect(paths).toEqual(["/api/auth/token"]);
  reply.resolve(session("login"));
  await Promise.all([login, refresh]);
  expect(paths).toEqual(["/api/auth/token", "/api/auth/refresh"]);
  expect(api.getAccessToken()).toBe("refreshed-login");
});

test("failed remote logout still permits an explicit later login", async () => {
  globalThis.fetch = mock(async (input: string | URL | Request) => {
    if (String(input).endsWith("/logout")) throw new Error("offline cleanup");
    return session("new-session");
  }) as unknown as typeof fetch;
  await expect(api.logout()).rejects.toThrow("offline cleanup");
  await api.exchangeCode("code");
  expect(api.getAccessToken()).toBe("new-session");
});
