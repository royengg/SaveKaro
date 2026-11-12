import { afterEach, beforeEach, expect, mock, test } from "bun:test";

mock.module("../../config/constants", () => ({
  REDDIT_THROTTLE: { REQUEST_GAP_MS: 0, COOLDOWN_MS: 0 },
}));
mock.module("../../lib/logger", () => ({
  default: { info() {}, warn() {}, error() {} },
}));
const { fetchPostComments } = await import("./client");
const originalFetch = globalThis.fetch;
let responseStatus: number;
let networkFailure: boolean;
let malformed: boolean;

beforeEach(() => {
  responseStatus = 200;
  networkFailure = false;
  malformed = false;
  globalThis.fetch = mock(async (input: string | URL | Request) => {
    if (String(input).endsWith("/api/v1/access_token")) {
      return Response.json({ access_token: "test-token", expires_in: 3600 });
    }
    if (networkFailure) throw new Error("network unavailable");
    return new Response(
      malformed ? "not-json" : JSON.stringify([{}, { data: { children: [] } }]),
      {
        status: responseStatus,
        headers: { "retry-after": "0" },
      },
    );
  }) as unknown as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test.each([401, 408, 429, 500, 503])(
  "HTTP %i rejects comment retrieval so its batch can retry",
  async (status) => {
    responseStatus = status;
    await expect(fetchPostComments("test", "post")).rejects.toThrow(
      String(status),
    );
  },
);

test.each([403, 404])(
  "HTTP %i retains the unavailable-comments fallback",
  async (status) => {
    responseStatus = status;
    await expect(fetchPostComments("test", "post")).resolves.toEqual([]);
  },
);

test("network failures reject instead of looking like an empty comment list", async () => {
  networkFailure = true;
  await expect(fetchPostComments("test", "post")).rejects.toThrow(
    "network unavailable",
  );
});

test("malformed provider responses reject instead of being silently skipped", async () => {
  malformed = true;
  await expect(fetchPostComments("test", "post")).rejects.toThrow();
});

test("an actually empty successful comment listing stays successful", async () => {
  await expect(fetchPostComments("test", "post")).resolves.toEqual([]);
});
