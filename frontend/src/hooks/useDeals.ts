import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  type InfiniteData,
  type QueryClient,
} from "@tanstack/react-query";
import api from "@/lib/api";
import type { Deal, Category, DealRegion } from "@/store/filterStore";

interface DealsResponse {
  success: boolean;
  data: Deal[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore?: boolean;
  };
}

interface PriceHistoryPoint {
  id: string;
  price: string;
  createdAt: string;
  source?: string;
}

interface PriceHistoryResponse {
  success: boolean;
  data: PriceHistoryPoint[];
}

interface CategoriesResponse {
  success: boolean;
  data: Category[];
}

interface DealResponse {
  success: boolean;
  data: Deal;
}

interface VoteResponse {
  success: boolean;
  data: {
    upvoteCount: number;
  };
}

interface SaveResponse {
  success: boolean;
  data: {
    saved: boolean;
  };
}

interface VoteMutationContext {
  previousDealQueries: Array<
    [readonly unknown[], InfiniteData<DealsResponse> | undefined]
  >;
  previousDealDetail: Deal | undefined;
}

interface SaveMutationContext extends VoteMutationContext {
  previousSavedDeals: Deal[] | undefined;
}

const DEALS_PAGE_LIMIT = 20;
const DEALS_MAX_PAGES = 12;
const AMAZON_DEALS_FETCH_LIMIT = 18;

const updateDealInInfiniteData = (
  oldData: InfiniteData<DealsResponse> | undefined,
  dealId: string,
  updater: (deal: Deal) => Deal,
) => {
  if (!oldData) return oldData;

  return {
    ...oldData,
    pages: oldData.pages.map((page) => ({
      ...page,
      data: page.data.map((deal) => (deal.id === dealId ? updater(deal) : deal)),
    })),
  };
};

const updateDealCaches = (
  queryClient: QueryClient,
  dealId: string,
  updater: (deal: Deal) => Deal,
) => {
  queryClient.setQueriesData<InfiniteData<DealsResponse>>(
    { queryKey: ["deals"] },
    (oldData) => updateDealInInfiniteData(oldData, dealId, updater),
  );

  queryClient.setQueryData<Deal | undefined>(["deal", dealId], (oldDeal) =>
    oldDeal ? updater(oldDeal) : oldDeal,
  );
};

const rollbackDealCaches = (
  queryClient: QueryClient,
  dealId: string,
  context?: VoteMutationContext,
) => {
  if (!context) return;

  context.previousDealQueries.forEach(([queryKey, previousData]) => {
    queryClient.setQueryData(queryKey, previousData);
  });
  queryClient.setQueryData(["deal", dealId], context.previousDealDetail);
};

const findDealInInfiniteData = (
  data: InfiniteData<DealsResponse> | undefined,
  dealId: string,
) => {
  if (!data) return undefined;
  for (const page of data.pages) {
    const deal = page.data.find((entry) => entry.id === dealId);
    if (deal) return deal;
  }
  return undefined;
};

const findDealInCache = (queryClient: QueryClient, dealId: string) => {
  const fromDetail = queryClient.getQueryData<Deal>(["deal", dealId]);
  if (fromDetail) return fromDetail;

  const allDealQueries = queryClient.getQueriesData<InfiniteData<DealsResponse>>({
    queryKey: ["deals"],
  });

  for (const [, data] of allDealQueries) {
    const found = findDealInInfiniteData(data, dealId);
    if (found) return found;
  }

  return undefined;
};

// Deals queries
export function useDeals(params?: {
  category?: string | null;
  store?: string | null;
  minDiscount?: number | null;
  search?: string;
  sortBy?: "newest" | "popular" | "discount";
  region?: DealRegion;
  maxPages?: number;
  retainAllPages?: boolean;
}) {
  return useInfiniteQuery({
    queryKey: ["deals", params],
    queryFn: async ({ pageParam = 1 }) => {
      const response = (await api.getDeals({
        page: pageParam,
        limit: DEALS_PAGE_LIMIT,
        category: params?.category || undefined,
        store: params?.store || undefined,
        minDiscount: params?.minDiscount || undefined,
        search: params?.search || undefined,
        sortBy: params?.sortBy || "newest",
        region: params?.region || undefined,
      })) as DealsResponse;
      return response;
    },
    getNextPageParam: (lastPage) => {
      if (typeof lastPage.pagination.hasMore === "boolean") {
        return lastPage.pagination.hasMore
          ? lastPage.pagination.page + 1
          : undefined;
      }

      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    ...(params?.retainAllPages
      ? {}
      : { maxPages: params?.maxPages ?? DEALS_MAX_PAGES }),
  });
}

export function useAmazonDeals(options?: {
  region?: DealRegion;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["amazon-deals", options?.region ?? null],
    queryFn: async () => {
      const response = (await api.getDeals({
        page: 1,
        limit: AMAZON_DEALS_FETCH_LIMIT,
        store: "amazon",
        sortBy: "newest",
        region: options?.region,
      })) as DealsResponse;
      return response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 2,
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      const response = (await api.getDeal(id)) as DealResponse;
      return response.data;
    },
    enabled: !!id,
  });
}

export function useDealPriceHistory(
  dealId: string,
  options?: {
    enabled?: boolean;
    limit?: number;
  },
) {
  const limit = options?.limit ?? 30;

  return useQuery({
    queryKey: ["deal-price-history", dealId, limit],
    queryFn: async () => {
      const response = (await api.getDealPriceHistory(
        dealId,
        1,
        limit,
      )) as PriceHistoryResponse;
      return response.data;
    },
    enabled: !!dealId && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 2,
  });
}

// Categories
export function useCategories(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = (await api.getCategories()) as CategoriesResponse;
      return response.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// Mutations
export function useVoteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: 1 | -1 | 0 }) =>
      api.voteDeal(id, value) as Promise<VoteResponse>,
    onMutate: async ({ id, value }): Promise<VoteMutationContext> => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["deals"] }),
        queryClient.cancelQueries({ queryKey: ["deal", id] }),
      ]);

      const previousDealQueries =
        queryClient.getQueriesData<InfiniteData<DealsResponse>>({
          queryKey: ["deals"],
        });
      const previousDealDetail = queryClient.getQueryData<Deal>(["deal", id]);

      updateDealCaches(queryClient, id, (deal) => {
        const previousVote = deal.userUpvote ?? 0;
        const nextVote = value === 0 ? null : value;
        const voteDelta = (nextVote ?? 0) - previousVote;

        return {
          ...deal,
          userUpvote: nextVote,
          upvoteCount: deal.upvoteCount + voteDelta,
        };
      });

      return { previousDealQueries, previousDealDetail };
    },
    onSuccess: (response, { id, value }) => {
      updateDealCaches(queryClient, id, (deal) => ({
        ...deal,
        userUpvote: value === 0 ? null : value,
        upvoteCount: response.data.upvoteCount,
      }));
    },
    onError: (_, variables, context) => {
      rollbackDealCaches(queryClient, variables.id, context);
    },
  });
}

export function useSaveDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.saveDeal(id) as Promise<SaveResponse>,
    onMutate: async (id): Promise<SaveMutationContext> => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["deals"] }),
        queryClient.cancelQueries({ queryKey: ["deal", id] }),
        queryClient.cancelQueries({ queryKey: ["savedDeals"] }),
      ]);

      const previousDealQueries =
        queryClient.getQueriesData<InfiniteData<DealsResponse>>({
          queryKey: ["deals"],
        });
      const previousDealDetail = queryClient.getQueryData<Deal>(["deal", id]);
      const previousSavedDeals = queryClient.getQueryData<Deal[]>(["savedDeals"]);
      const cachedDeal = findDealInCache(queryClient, id);

      updateDealCaches(queryClient, id, (deal) => ({
        ...deal,
        userSaved: !deal.userSaved,
      }));

      queryClient.setQueryData<Deal[] | undefined>(["savedDeals"], (oldSaved) => {
        if (!oldSaved) return oldSaved;

        const exists = oldSaved.some((deal) => deal.id === id);
        if (exists) {
          return oldSaved.filter((deal) => deal.id !== id);
        }

        if (cachedDeal) {
          return [{ ...cachedDeal, userSaved: true }, ...oldSaved];
        }

        return oldSaved;
      });

      return { previousDealQueries, previousDealDetail, previousSavedDeals };
    },
    onSuccess: (response, id) => {
      const { saved } = response.data;
      const cachedDeal = findDealInCache(queryClient, id);

      updateDealCaches(queryClient, id, (deal) => ({
        ...deal,
        userSaved: saved,
      }));

      queryClient.setQueryData<Deal[] | undefined>(["savedDeals"], (oldSaved) => {
        if (!oldSaved) return oldSaved;

        const exists = oldSaved.some((deal) => deal.id === id);

        if (!saved) {
          return exists ? oldSaved.filter((deal) => deal.id !== id) : oldSaved;
        }

        if (exists) {
          return oldSaved.map((deal) =>
            deal.id === id ? { ...deal, userSaved: true } : deal,
          );
        }

        if (cachedDeal) {
          return [{ ...cachedDeal, userSaved: true }, ...oldSaved];
        }

        return oldSaved;
      });
    },
    onError: (_, variables, context) => {
      rollbackDealCaches(queryClient, variables, context);
      if (context) {
        queryClient.setQueryData(["savedDeals"], context.previousSavedDeals);
      }
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteDeal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof api.createDeal>[0]) =>
      api.createDeal(data),
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

// Comments
export function useComments(dealId: string) {
  return useQuery({
    queryKey: ["comments", dealId],
    queryFn: async () => {
      const response = (await api.getComments(dealId)) as {
        success: boolean;
        data: unknown[];
      };
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
      const response = (await api.getNotifications()) as {
        success: boolean;
        data: unknown[];
        unreadCount: number;
      };
      return response;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
