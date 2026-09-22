import { create } from "zustand";
import api, { type AuthSessionData } from "@/lib/api";

const AUTH_SESSION_HINT_KEY = "savekaro-auth-session";
let sessionRestorePromise: Promise<void> | null = null;

function hasStoredSessionHint(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(AUTH_SESSION_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

function persistSessionHint() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(AUTH_SESSION_HINT_KEY, "1");
  } catch {
    // Ignore storage access failures and continue with in-memory auth state.
  }
}

function clearSessionHint() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(AUTH_SESSION_HINT_KEY);
  } catch {
    // Ignore storage access failures and continue with in-memory auth state.
  }
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isAdmin?: boolean;
  preferences?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    preferredCategories: string[];
    minDiscountPercent: number;
  };
  _count?: {
    savedDeals: number;
    submittedDeals: number;
    comments: number;
  };
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasAttemptedSessionRestore: boolean;

  setUser: (user: User | null) => void;
  bootstrapAuth: () => Promise<void>;
  login: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: (options?: { force?: boolean }) => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  hasAttemptedSessionRestore: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  bootstrapAuth: async () => {
    if (!hasStoredSessionHint()) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        hasAttemptedSessionRestore: false,
      });
      return;
    }

    await get().checkAuth({ force: true });
  },

  login: async (code: string) => {
    set({ isLoading: true });

    try {
      const session = await api.exchangeCode<User>(code);
      const user = session.user ?? await getLegacySessionUser();
      if (user) {
        persistSessionHint();
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          hasAttemptedSessionRestore: true,
        });
      } else {
        throw new Error("Failed to get user");
      }
    } catch (error) {
      console.error("Login error:", error);
      api.setAccessToken(null);
      clearSessionHint();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        hasAttemptedSessionRestore: true,
      });
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      // Logout should always succeed client-side
    }
    clearSessionHint();
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      hasAttemptedSessionRestore: true,
    });
    window.dispatchEvent(new CustomEvent("savekaro:auth-cleared"));
  },

  checkAuth: async ({ force = false } = {}) => {
    if (!force && !hasStoredSessionHint()) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        hasAttemptedSessionRestore: false,
      });
      return;
    }

    if (sessionRestorePromise) return sessionRestorePromise;

    sessionRestorePromise = (async () => {
      set({ isLoading: true });

      try {
        const session = (await api.refreshAccessToken()) as AuthSessionData<User> | null;
        if (!session) {
          clearSessionHint();
          set({
            isLoading: false,
            isAuthenticated: false,
            user: null,
            hasAttemptedSessionRestore: true,
          });
          return;
        }

        const user = session.user ?? await getLegacySessionUser();
        if (!user) throw new Error("Failed to get user");

        persistSessionHint();
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          hasAttemptedSessionRestore: true,
        });
      } catch (error) {
        console.error("Auth check error:", error);
        api.setAccessToken(null);
        clearSessionHint();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          hasAttemptedSessionRestore: true,
        });
      }
    })();

    try {
      await sessionRestorePromise;
    } finally {
      sessionRestorePromise = null;
    }
  },
}));

async function getLegacySessionUser(): Promise<User | null> {
  const response = (await api.getCurrentUser()) as {
    success: boolean;
    data?: User;
  };
  return response.success ? response.data ?? null : null;
}

export default useAuthStore;
