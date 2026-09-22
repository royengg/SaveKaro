import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import api, { ApiError } from "@/lib/api";
import type {
  CategoriesResponse,
  DealsResponse,
  HomeUserSummary,
  HomeUserSummaryResponse,
  NotificationsResponse,
  SavedDealSignal,
} from "./_dealCacheUtils";

export function useCategories(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async ({ signal }) => {
      const response = (await api.getCategories(signal)) as CategoriesResponse;
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
    queryFn: async ({ signal }) => {
      const response = (await api.getHomeUserSummary(signal)) as HomeUserSummaryResponse;
      return response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 30,
    refetchInterval: (options?.enabled ?? true) ? 30000 : false,
  });
}

async function getLegacyHomeSummary(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string | null,
) {
  return queryClient.fetchQuery<HomeUserSummary>({
    queryKey: ["homeUserSummary", userId],
    queryFn: async ({ signal }) => {
      const response = (await api.getHomeUserSummary(signal)) as HomeUserSummaryResponse;
      return response.data;
    },
    staleTime: 1000 * 30,
  });
}

export function useUnreadNotificationCount(options?: {
  enabled?: boolean;
  userId?: string | null;
}) {
  const queryClient = useQueryClient();
  const userId = options?.userId ?? null;

  return useQuery({
    queryKey: ["unreadNotificationCount", userId],
    queryFn: async ({ signal }) => {
      try {
        const response = (await api.getUnreadNotificationCount(signal)) as {
          success: boolean;
          data: { unreadNotificationCount: number };
        };
        return response.data.unreadNotificationCount;
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 404) throw error;
        return (await getLegacyHomeSummary(queryClient, userId))
          .unreadNotificationCount;
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 30,
    refetchInterval: (options?.enabled ?? true) ? 30000 : false,
  });
}

export function useSavedSignals(options?: {
  enabled?: boolean;
  userId?: string | null;
}) {
  const queryClient = useQueryClient();
  const userId = options?.userId ?? null;

  return useQuery({
    queryKey: ["savedSignals", userId],
    queryFn: async ({ signal }) => {
      try {
        const response = (await api.getSavedSignals(signal)) as {
          success: boolean;
          data: { savedSignals: SavedDealSignal[] };
        };
        return response.data.savedSignals;
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 404) throw error;
        return (await getLegacyHomeSummary(queryClient, userId)).savedSignals;
      }
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}

export function useSavedDeals(options?: {
  enabled?: boolean;
  userId?: string | null;
}) {
  const query = useInfiniteQuery<
    DealsResponse,
    Error,
    InfiniteData<DealsResponse>,
    readonly [string, string | null],
    number
  >({
    queryKey: ["savedDeals", options?.userId ?? null],
    queryFn: async ({ pageParam, signal }) => {
      return (await api.getSavedDeals(pageParam, 20, signal)) as DealsResponse;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 2,
  });

  return {
    ...query,
    data: query.data?.pages.flatMap((page) => page.data),
    total: query.data?.pages[0]?.pagination.total ?? 0,
  };
}

export function useUserStats(userId?: string | null) {
  return useQuery({
    queryKey: ["userStats", userId ?? null],
    queryFn: async ({ signal }) => {
      const response = (await api.getUserStats(signal)) as {
        success: boolean;
        data: unknown;
      };
      return response.data;
    },
  });
}

export function useNotifications({
  enabled = true,
  userId = null,
  unreadOnly = false,
}: {
  enabled?: boolean;
  userId?: string | null;
  unreadOnly?: boolean;
} = {}) {
  const query = useInfiniteQuery<
    NotificationsResponse,
    Error,
    InfiniteData<NotificationsResponse>,
    readonly [string, string | null, boolean],
    number
  >({
    queryKey: ["notifications", userId, unreadOnly],
    queryFn: async ({ pageParam, signal }) => {
      return (await api.getNotifications(
        pageParam,
        20,
        unreadOnly,
        signal,
      )) as NotificationsResponse;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      return pagination && pagination.page < pagination.totalPages
        ? pagination.page + 1
        : undefined;
    },
    enabled,
    staleTime: 1000 * 30,
  });

  const firstPage = query.data?.pages[0];
  return {
    ...query,
    total: firstPage?.pagination?.total ?? firstPage?.data.length ?? 0,
    data: firstPage
      ? {
          ...firstPage,
          data: query.data?.pages.flatMap((page) => page.data) ?? [],
        }
      : undefined,
  };
}
