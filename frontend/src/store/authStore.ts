import { create } from "zustand";
import api from "@/lib/api";

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

  setUser: (user: User | null) => void;
  login: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

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
        set({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        throw new Error("Failed to get user");
      }
    } catch (error) {
      console.error("Login error:", error);
      api.setAccessToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      // Logout should always succeed client-side
    }
    set({ user: null, isAuthenticated: false });
  },

  // On app load, try to refresh the access token using the httpOnly cookie
  checkAuth: async () => {
    set({ isLoading: true });

    try {
      // Try to refresh the access token
      const newToken = await api.refreshAccessToken();
      if (!newToken) {
        set({ isLoading: false, isAuthenticated: false, user: null });
        return;
      }

      // Fetch user profile
      const response = (await api.getCurrentUser()) as {
        success: boolean;
        data: User;
      };
      if (response.success && response.data) {
        set({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        throw new Error("Failed to get user");
      }
    } catch (error) {
      console.error("Auth check error:", error);
      api.setAccessToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

export default useAuthStore;
