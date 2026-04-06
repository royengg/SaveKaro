import { create } from "zustand";
import api from "@/lib/api";

const AUTH_SESSION_HINT_KEY = "savekaro-auth-session";

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

  // Exchange one-time auth code for tokens, then fetch user
  login: async (code: string) => {
    set({ isLoading: true });

    try {
      // Exchange the one-time code for access token (refresh token set as cookie automatically)
      await api.exchangeCode(code);

      // Fetch user profile
      const response = (await api.getCurrentUser()) as {
        success: boolean;
        data: User;
      };
      if (response.success && response.data) {
        persistSessionHint();
        set({
          user: response.data,
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
  },

  // On app load, try to refresh the access token using the httpOnly cookie
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

    set({ isLoading: true });

    try {
      // Try to refresh the access token
      const newToken = await api.refreshAccessToken();
      if (!newToken) {
        clearSessionHint();
        set({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          hasAttemptedSessionRestore: true,
        });
        return;
      }

      // Fetch user profile
      const response = (await api.getCurrentUser()) as {
        success: boolean;
        data: User;
      };
      if (response.success && response.data) {
        persistSessionHint();
        set({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
          hasAttemptedSessionRestore: true,
        });
      } else {
        throw new Error("Failed to get user");
      }
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
  },
}));

export default useAuthStore;
