import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Deal, Category } from "@/store/filterStore";

interface DealsResponse {
  success: boolean;
  data: Deal[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface CategoriesResponse {
  success: boolean;
  data: Category[];
}

interface DealResponse {
  success: boolean;
  data: Deal;
}

// Deals queries
export function useDeals(params?: {
  category?: string | null;
  store?: string | null;
  minDiscount?: number | null;
  search?: string;
  sortBy?: "newest" | "popular" | "discount";
}) {
  return useInfiniteQuery({
    queryKey: ["deals", params],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await api.getDeals({
        page: pageParam,
        limit: 20,
        category: params?.category || undefined,
        store: params?.store || undefined,
        minDiscount: params?.minDiscount || undefined,
        search: params?.search || undefined,
        sortBy: params?.sortBy || "newest",
      }) as DealsResponse;
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      const response = await api.getDeal(id) as DealResponse;
      return response.data;
    },
    enabled: !!id,
  });
}

// Categories
export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.getCategories() as CategoriesResponse;
      return response.data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Mutations
export function useVoteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: 1 | -1 | 0 }) =>
      api.voteDeal(id, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useSaveDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.saveDeal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["savedDeals"] });
    },
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof api.createDeal>[0]) => api.createDeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useTrackClick() {
  return useMutation({
    mutationFn: (id: string) => api.trackClick(id),
  });
}

// User data
export function useSavedDeals() {
  return useQuery({
    queryKey: ["savedDeals"],
    queryFn: async () => {
      const response = await api.getSavedDeals() as DealsResponse;
      return response.data;
    },
  });
}

export function useUserStats() {
  return useQuery({
    queryKey: ["userStats"],
    queryFn: async () => {
      const response = await api.getUserStats() as { success: boolean; data: unknown };
      return response.data;
    },
  });
}

// Comments
export function useComments(dealId: string) {
  return useQuery({
    queryKey: ["comments", dealId],
    queryFn: async () => {
      const response = await api.getComments(dealId) as { success: boolean; data: unknown[] };
      return response.data;
    },
    enabled: !!dealId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      dealId,
      content,
      parentId,
    }: {
      dealId: string;
      content: string;
      parentId?: string;
    }) => api.createComment(dealId, content, parentId),
    onSuccess: (_, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", dealId] });
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
    },
  });
}

// Notifications
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await api.getNotifications() as {
        success: boolean;
        data: unknown[];
        unreadCount: number;
      };
      return response;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
