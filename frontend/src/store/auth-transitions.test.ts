import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const user = {
  id: "transition-user",
  email: "transitions@example.test",
  name: "Test user",
  avatarUrl: null,
};
const session = { accessToken: "test-token", expiresIn: 900, user };
const api = {
  refreshAccessToken: mock(async (): Promise<typeof session | null> => session),
  exchangeCode: mock(async (_code: string) => session),
  logout: mock(async () => {}),
  setAccessToken: mock((_token: string | null) => {}),
  getCurrentUser: mock(async () => ({ success: true, data: user })),
};
mock.module("@/lib/api", () => ({ default: api }));
const { useAuthStore } = await import("./authStore");
const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
let storage: Map<string, string>;
let events: EventTarget;

beforeEach(() => {
  storage = new Map();
  events = new EventTarget();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
        removeItem: (key: string) => storage.delete(key),
      },
      dispatchEvent: (event: Event) => events.dispatchEvent(event),
    },
  });
  api.refreshAccessToken.mockReset().mockResolvedValue(session);
  api.exchangeCode.mockReset().mockResolvedValue(session);
  api.logout.mockReset().mockResolvedValue(undefined);
  api.setAccessToken.mockClear();
  api.getCurrentUser.mockClear();
  useAuthStore.setState({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    hasAttemptedSessionRestore: false,
  });
});

afterEach(() => {
  if (previousWindow)
    Object.defineProperty(globalThis, "window", previousWindow);
  else Reflect.deleteProperty(globalThis, "window");
});

describe("web authentication transitions", () => {
  test("guest bootstrap finishes without a refresh request", async () => {
    await useAuthStore.getState().bootstrapAuth();
    expect(api.refreshAccessToken).not.toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
  });

  test("concurrent restores join one request and accept the same session", async () => {
    const pending = deferred<typeof session | null>();
    api.refreshAccessToken.mockImplementation(() => pending.promise);
    storage.set("savekaro-auth-session", "1");
    const first = useAuthStore.getState().checkAuth();
    const second = useAuthStore.getState().checkAuth();
    expect(api.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isLoading).toBe(true);
    pending.resolve(session);
    await Promise.all([first, second]);
    expect(useAuthStore.getState()).toMatchObject({
      user,
      isLoading: false,
      isAuthenticated: true,
    });
  });

  test("a refused restore clears the hint and permits a later forced retry", async () => {
    storage.set("savekaro-auth-session", "1");
    api.refreshAccessToken.mockResolvedValueOnce(null);
    await useAuthStore.getState().checkAuth();
    expect(storage.has("savekaro-auth-session")).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    await useAuthStore.getState().checkAuth({ force: true });
    expect(api.refreshAccessToken).toHaveBeenCalledTimes(2);
    expect(useAuthStore.getState().user).toEqual(user);
  });

  test("remote logout failure still clears local identity and emits cleanup", async () => {
    let cleared = 0;
    events.addEventListener("savekaro:auth-cleared", () => {
      cleared++;
    });
    storage.set("savekaro-auth-session", "1");
    useAuthStore.getState().setUser(user);
    api.logout.mockRejectedValueOnce(new Error("offline"));
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
    expect(storage.has("savekaro-auth-session")).toBe(false);
    expect(cleared).toBe(1);
  });

  test("[regression] a restore completing after logout must not resurrect identity", async () => {
    const pending = deferred<typeof session | null>();
    api.refreshAccessToken.mockImplementation(() => pending.promise);
    const restore = useAuthStore.getState().checkAuth({ force: true });
    await useAuthStore.getState().logout();
    pending.resolve(session);
    await restore;
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(storage.has("savekaro-auth-session")).toBe(false);
  });

  test("[regression] a login completing after logout must not resurrect identity", async () => {
    const pending = deferred<typeof session>();
    api.exchangeCode.mockImplementation(() => pending.promise);
    const login = useAuthStore.getState().login("one-time-code");
    await useAuthStore.getState().logout();
    pending.resolve(session);
    await login;
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(storage.has("savekaro-auth-session")).toBe(false);
  });
});
