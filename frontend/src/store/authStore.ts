import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
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
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  login: (token: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setToken: (token) => {
        api.setToken(token);
        set({ token });
      },

      login: async (token: string) => {
        set({ isLoading: true });
        api.setToken(token);
        set({ token });
        
        try {
          const response = await api.getCurrentUser() as { success: boolean; data: User };
          if (response.success && response.data) {
            set({ user: response.data, isAuthenticated: true, isLoading: false });
          } else {
            throw new Error("Failed to get user");
          }
        } catch (error) {
          console.error("Login error:", error);
          api.setToken(null);
          set({ token: null, user: null, isAuthenticated: false, isLoading: false });
        }
      },

      logout: () => {
        api.setToken(null);
        set({ user: null, token: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isLoading: false });
          return;
        }

        set({ isLoading: true });
        api.setToken(token);

        try {
          const response = await api.getCurrentUser() as { success: boolean; data: User };
          if (response.success && response.data) {
            set({ user: response.data, isAuthenticated: true, isLoading: false });
          } else {
            throw new Error("Failed to get user");
          }
        } catch (error) {
          console.error("Auth check error:", error);
          api.setToken(null);
          set({ token: null, user: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: "dealhunt-auth",
      partialize: (state) => ({ token: state.token }),
    }
  )
);

export default useAuthStore;
