import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
  CategoriesResponse,
  DealsResponse,
  HomeUserSummaryResponse,
  NotificationsResponse,
} from "./_dealCacheUtils";

export function useCategories(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = (await api.getCategories()) as CategoriesResponse;
      return response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 10,
  });
}

export function useHomeUserSummary(options?: {
  enabled?: boolean;
  userId?: string | null;
}) {
  return useQuery({
    queryKey: ["homeUserSummary", options?.userId ?? null],
    queryFn: async () => {
      const response = (await api.getHomeUserSummary()) as HomeUserSummaryResponse;
      return response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 30,
    refetchInterval: options?.enabled ?? true ? 30000 : false,
  });
}

export function useSavedDeals(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["savedDeals"],
    queryFn: async () => {
      const response = (await api.getSavedDeals()) as DealsResponse;
      return response.data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: ["userStats"],
    queryFn: async () => {
      const response = (await api.getUserStats()) as {
        success: boolean;
        data: unknown;
      };
      return response.data;
    },
  });
}

export function useNotifications({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<NotificationsResponse>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = (await api.getNotifications()) as NotificationsResponse;
      return response;
    },
    enabled,
    refetchInterval: enabled ? 30000 : false,
  });
}
