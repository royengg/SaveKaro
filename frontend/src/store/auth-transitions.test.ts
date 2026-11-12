import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { AuthSessionData } from "@/lib/api";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

const user = {
  id: "transition-user",
  email: "transitions@example.test",
  name: "Test user",
  avatarUrl: null,
};
const session: AuthSessionData<typeof user> = {
  accessToken: "test-token",
  expiresIn: 900,
  user,
};
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

  test("logout is immediate even while remote cleanup and an old restore are pending", async () => {
    const pending = deferred<typeof session | null>();
    const cleanup = deferred<void>();
    api.refreshAccessToken.mockImplementation(() => pending.promise);
    api.logout.mockImplementation(() => cleanup.promise);
    const restore = useAuthStore.getState().checkAuth({ force: true });
    const logout = useAuthStore.getState().logout();
    expect(useAuthStore.getState().isLoading).toBe(false);
    pending.resolve(session);
    await restore;
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    cleanup.resolve();
    await logout;
  });

  test("a stale restore failure cannot clear a newer login", async () => {
    const pending = deferred<typeof session | null>();
    api.refreshAccessToken.mockImplementation(() => pending.promise);
    const restore = useAuthStore.getState().checkAuth({ force: true });
    await useAuthStore.getState().login("new-code");
    pending.reject(new Error("old refresh failed"));
    await restore;
    expect(useAuthStore.getState().user).toEqual(user);
    expect(storage.get("savekaro-auth-session")).toBe("1");
    expect(api.setAccessToken).not.toHaveBeenCalled();
  });

  test("a stale restore cannot release a newer restore's single-flight latch", async () => {
    const old = deferred<typeof session | null>();
    const current = deferred<typeof session | null>();
    api.refreshAccessToken
      .mockImplementationOnce(() => old.promise)
      .mockImplementationOnce(() => current.promise);
    const oldRestore = useAuthStore.getState().checkAuth({ force: true });
    await useAuthStore.getState().logout();
    const newRestore = useAuthStore.getState().checkAuth({ force: true });
    old.resolve(session);
    await oldRestore;
    const joined = useAuthStore.getState().checkAuth({ force: true });
    expect(api.refreshAccessToken).toHaveBeenCalledTimes(2);
    current.resolve(session);
    await Promise.all([newRestore, joined]);
    expect(useAuthStore.getState().user).toEqual(user);
  });

  test("logout during legacy user lookup cannot restore identity", async () => {
    const legacy = deferred<{ success: boolean; data: typeof user }>();
    const lookupStarted = deferred<void>();
    api.exchangeCode.mockResolvedValueOnce({
      accessToken: "legacy",
      expiresIn: 900,
    });
    api.getCurrentUser.mockImplementationOnce(() => {
      lookupStarted.resolve();
      return legacy.promise;
    });
    const login = useAuthStore.getState().login("legacy-code");
    await lookupStarted.promise;
    await useAuthStore.getState().logout();
    legacy.resolve({ success: true, data: user });
    await login;
    expect(useAuthStore.getState().user).toBeNull();
  });

  test("an older login failure cannot clear a more recent successful login", async () => {
    const old = deferred<typeof session>();
    api.exchangeCode.mockImplementationOnce(() => old.promise);
    const oldLogin = useAuthStore.getState().login("old-code");
    await useAuthStore.getState().login("new-code");
    old.reject(new Error("old exchange failed"));
    await oldLogin;
    expect(useAuthStore.getState().user).toEqual(user);
    expect(api.setAccessToken).not.toHaveBeenCalled();
  });

  test("an older login success cannot replace the most recent account", async () => {
    const old = deferred<typeof session>();
    const newUser = { ...user, id: "new-user" };
    api.exchangeCode
      .mockImplementationOnce(() => old.promise)
      .mockResolvedValueOnce({ ...session, user: newUser });
    const oldLogin = useAuthStore.getState().login("old-code");
    await useAuthStore.getState().login("new-code");
    old.resolve(session);
    await oldLogin;
    expect(useAuthStore.getState().user).toEqual(newUser);
  });
});
