import { describe, expect, mock, test } from "bun:test";
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { createApiClient } from "../src";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function reply(config: InternalAxiosRequestConfig, status: number) {
  return {
    config,
    status,
    statusText: "",
    headers: {},
    data:
      status === 200
        ? { success: true, data: config.url }
        : { success: false, error: "Test response" },
  };
}

describe("shared client cancellation and refresh transitions", () => {
  test("aborting one refresh waiter does not cancel another or replay the aborted request", async () => {
    const refreshResult = deferred<string>();
    const refreshStarted = deferred<void>();
    const initialRequests = deferred<void>();
    const attempts = new Map<string, number>();
    let initialCount = 0;
    const refresh = mock(() => {
      refreshStarted.resolve();
      return refreshResult.promise;
    });
    const unauthorized = mock(() => {});
    const adapter: AxiosAdapter = async (config) => {
      const path = config.url!;
      attempts.set(path, (attempts.get(path) ?? 0) + 1);
      if (config.headers.get("Authorization") === "Bearer expired") {
        if (++initialCount === 2) initialRequests.resolve();
        return reply(config, 401);
      }
      return reply(config, 200);
    };
    const client = createApiClient({
      baseUrl: "https://api.example.test",
      getAccessToken: () => "expired",
      refreshAccessToken: refresh,
      onUnauthorized: unauthorized,
      adapter,
    });
    const controller = new AbortController();
    // Attach rejection handling immediately, before aborting.
    const cancelled = client
      .request("/cancelled", { signal: controller.signal })
      .catch((error: unknown) => error);
    const surviving = client.request<string>("/surviving");
    await Promise.all([refreshStarted.promise, initialRequests.promise]);
    controller.abort();
    expect(await cancelled).toMatchObject({ name: "AbortError" });
    refreshResult.resolve("fresh");
    expect(await surviving).toBe("/surviving");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(unauthorized).not.toHaveBeenCalled();
    expect(attempts).toEqual(
      new Map([
        ["/cancelled", 1],
        ["/surviving", 2],
      ]),
    );
  });

  test("a rejected shared refresh releases its latch for a later attempt", async () => {
    const firstRefresh = deferred<string>();
    const started = deferred<void>();
    const refresh = mock(() => {
      started.resolve();
      return firstRefresh.promise;
    });
    const adapter: AxiosAdapter = async (config) =>
      reply(
        config,
        config.headers.get("Authorization") === "Bearer fresh" ? 200 : 401,
      );
    const client = createApiClient({
      baseUrl: "https://api.example.test",
      getAccessToken: () => "expired",
      refreshAccessToken: refresh,
      adapter,
    });
    const failure = new Error("refresh unavailable");
    const result = client.request("/first").catch((error: unknown) => error);
    await started.promise;
    firstRefresh.reject(failure);
    expect(await result).toBe(failure);
    refresh.mockResolvedValue("fresh");
    expect(await client.request<string>("/retry")).toBe("/retry");
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  test("a second 401 terminates after one replay and calls unauthorized once", async () => {
    const adapter = mock(async (config: InternalAxiosRequestConfig) =>
      reply(config, 401),
    );
    const refresh = mock(async () => "fresh");
    const unauthorized = mock(() => {});
    const client = createApiClient({
      baseUrl: "https://api.example.test",
      getAccessToken: () => "expired",
      refreshAccessToken: refresh,
      onUnauthorized: unauthorized,
      adapter,
    });
    await expect(client.request("/still-unauthorized")).rejects.toMatchObject({
      status: 401,
    });
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });

  test("a public 401 does not start refresh or clear an unrelated session", async () => {
    const refresh = mock(async () => "fresh");
    const unauthorized = mock(() => {});
    const adapter = mock(async (config: InternalAxiosRequestConfig) => {
      expect(config.headers.has("Authorization")).toBe(false);
      return reply(config, 401);
    });
    const client = createApiClient({
      baseUrl: "https://api.example.test",
      getAccessToken: () => "existing-token",
      refreshAccessToken: refresh,
      onUnauthorized: unauthorized,
      adapter,
    });
    await expect(
      client.request("/public", { authenticated: false }),
    ).rejects.toMatchObject({ status: 401 });
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
    expect(unauthorized).not.toHaveBeenCalled();
  });

  test("cancellation while acquiring a token prevents the transport call", async () => {
    const token = deferred<string>();
    const adapter = mock(async (config: InternalAxiosRequestConfig) =>
      reply(config, 200),
    );
    const client = createApiClient({
      baseUrl: "https://api.example.test",
      getAccessToken: () => token.promise,
      adapter,
    });
    const controller = new AbortController();
    const result = client
      .request("/cancelled", { signal: controller.signal })
      .catch((error: unknown) => error);
    controller.abort();
    expect(await result).toMatchObject({ name: "AbortError" });
    token.resolve("late-token");
    // Drain the promise completion so the no-transport assertion covers late resolution too.
    await token.promise;
    expect(adapter).not.toHaveBeenCalled();
  });

  test.each([403, 429, 503])(
    "HTTP %i does not trigger auth refresh or automatic replay",
    async (status) => {
      const adapter = mock(async (config: InternalAxiosRequestConfig) =>
        reply(config, status),
      );
      const refresh = mock(async () => "fresh");
      const client = createApiClient({
        baseUrl: "https://api.example.test",
        getAccessToken: () => "token",
        refreshAccessToken: refresh,
        adapter,
      });
      await expect(
        client.request("/deals", { method: "POST", body: { title: "Deal" } }),
      ).rejects.toMatchObject({ status });
      expect(adapter).toHaveBeenCalledTimes(1);
      expect(refresh).not.toHaveBeenCalled();
    },
  );
});
