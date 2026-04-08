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

interface HomeBootstrapResponse {
  success: boolean;
  data: {
    feed: DealsResponse;
    amazonDeals: Deal[];
    myntraDeals: Deal[];
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

export interface SavedDealSignal {
  id: string;
  title: string;
  cleanTitle: string | null;
  brand: string | null;
  store: string | null;
  region: DealRegion;
  category: {
    slug: string;
  };
}

export interface HomeUserSummary {
  unreadNotificationCount: number;
  savedSignals: SavedDealSignal[];
}

interface HomeUserSummaryResponse {
  success: boolean;
  data: HomeUserSummary;
}

export interface NotificationItem {
  id: string;
  type: "NEW_DEAL" | "PRICE_DROP" | "COMMENT_REPLY" | "DEAL_UPVOTED" | "SYSTEM";
  title: string;
  message: string;
  data?: { dealId?: string };
  isRead: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  success: boolean;
  data: NotificationItem[];
  unreadCount: number;
}

interface VoteMutationContext {
  previousDealQueries: Array<
    [readonly unknown[], InfiniteData<DealsResponse> | undefined]
  >;
  previousDealDetail: Deal | undefined;
  previousSavedDeals: Deal[] | undefined;
}

interface SaveMutationContext extends VoteMutationContext {
  previousHomeUserSummaryQueries: Array<
    [readonly unknown[], HomeUserSummary | undefined]
  >;
}

const DEALS_PAGE_LIMIT = 20;
const DEALS_MAX_PAGES = 12;
const AMAZON_DEALS_FETCH_LIMIT = 18;
const STORE_SHOWCASE_FETCH_LIMIT = 18;

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

  queryClient.setQueryData<Deal[] | undefined>(["savedDeals"], (oldSavedDeals) =>
    oldSavedDeals?.map((deal) => (deal.id === dealId ? updater(deal) : deal)),
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
  queryClient.setQueryData(["savedDeals"], context.previousSavedDeals);
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

const toSavedDealSignal = (deal: Deal): SavedDealSignal => ({
  id: deal.id,
  title: deal.title,
  cleanTitle: deal.cleanTitle ?? null,
  brand: deal.brand ?? null,
  store: deal.store ?? null,
  region: deal.region,
  category: {
    slug: deal.category.slug,
  },
});

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
  enabled?: boolean;
  initialData?: InfiniteData<DealsResponse, number>;
}) {
  const queryKeyParams = {
    category: params?.category ?? null,
    store: params?.store ?? null,
    minDiscount: params?.minDiscount ?? null,
    search: params?.search ?? "",
    sortBy: params?.sortBy ?? "newest",
    region: params?.region ?? null,
  };

  return useInfiniteQuery<
    DealsResponse,
    Error,
    InfiniteData<DealsResponse>,
    readonly [string, typeof queryKeyParams],
    number
  >({
    queryKey: ["deals", queryKeyParams] as const,
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
    enabled: params?.enabled ?? true,
    initialData: params?.initialData,
    ...(params?.retainAllPages
      ? {}
      : { maxPages: params?.maxPages ?? DEALS_MAX_PAGES }),
  });
}

export function useHomeBootstrap(params?: {
  category?: string | null;
  store?: string | null;
  minDiscount?: number | null;
  search?: string;
  sortBy?: "newest" | "popular" | "discount";
  region?: DealRegion;
  enabled?: boolean;
}) {
  const queryKeyParams = {
    category: params?.category ?? null,
    store: params?.store ?? null,
    minDiscount: params?.minDiscount ?? null,
    search: params?.search ?? "",
    sortBy: params?.sortBy ?? "newest",
    region: params?.region ?? null,
  };

  return useQuery({
    queryKey: ["homePublicBootstrap", queryKeyParams],
    queryFn: async () => {
      const response = (await api.getHomeBootstrap({
        limit: DEALS_PAGE_LIMIT,
        category: params?.category || undefined,
        store: params?.store || undefined,
        minDiscount: params?.minDiscount || undefined,
        search: params?.search || undefined,
        sortBy: params?.sortBy || "newest",
        region: params?.region || undefined,
      })) as HomeBootstrapResponse;
      return response.data;
    },
    enabled: params?.enabled ?? true,
    staleTime: 1000 * 60 * 2,
  });
}

export function useAmazonDeals(options?: {
  region?: DealRegion;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ["amazon-deals", "v3", options?.region ?? null],
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

export function useStoreDeals(options: {
  store: string;
  region?: DealRegion;
  enabled?: boolean;
}) {
  const normalizedStore = options.store.trim().toLowerCase();

  return useQuery({
    queryKey: ["store-deals", normalizedStore, options.region ?? null],
    queryFn: async () => {
      const response = (await api.getDeals({
        page: 1,
        limit: STORE_SHOWCASE_FETCH_LIMIT,
        store: normalizedStore,
        sortBy: "newest",
        region: options.region,
      })) as DealsResponse;
      return response.data;
    },
    enabled: (options.enabled ?? true) && normalizedStore.length > 0,
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
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
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
        queryClient.cancelQueries({ queryKey: ["savedDeals"] }),
      ]);

      const previousDealQueries =
        queryClient.getQueriesData<InfiniteData<DealsResponse>>({
          queryKey: ["deals"],
        });
      const previousDealDetail = queryClient.getQueryData<Deal>(["deal", id]);
      const previousSavedDeals = queryClient.getQueryData<Deal[]>(["savedDeals"]);

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

      return { previousDealQueries, previousDealDetail, previousSavedDeals };
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
      const previousHomeUserSummaryQueries =
        queryClient.getQueriesData<HomeUserSummary>({
          queryKey: ["homeUserSummary"],
        });
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

      queryClient.setQueriesData<HomeUserSummary | undefined>(
        { queryKey: ["homeUserSummary"] },
        (current) => {
          if (!current) {
            return current;
          }

          const hasSignal = current.savedSignals.some((signal) => signal.id === id);
          if (hasSignal) {
            return {
              ...current,
              savedSignals: current.savedSignals.filter((signal) => signal.id !== id),
            };
          }

          if (!cachedDeal) {
            return current;
          }

          return {
            ...current,
            savedSignals: [toSavedDealSignal(cachedDeal), ...current.savedSignals],
          };
        },
      );

      return {
        previousDealQueries,
        previousDealDetail,
        previousSavedDeals,
        previousHomeUserSummaryQueries,
      };
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

      queryClient.setQueriesData<HomeUserSummary | undefined>(
        { queryKey: ["homeUserSummary"] },
        (current) => {
          if (!current) {
            return current;
          }

          const hasSignal = current.savedSignals.some((signal) => signal.id === id);

          if (!saved) {
            if (!hasSignal) {
              return current;
            }

            return {
              ...current,
              savedSignals: current.savedSignals.filter((signal) => signal.id !== id),
            };
          }

          if (hasSignal || !cachedDeal) {
            return current;
          }

          return {
            ...current,
            savedSignals: [toSavedDealSignal(cachedDeal), ...current.savedSignals],
          };
        },
      );
    },
    onError: (_, variables, context) => {
      rollbackDealCaches(queryClient, variables, context);
      if (context) {
        queryClient.setQueryData(["savedDeals"], context.previousSavedDeals);
        context.previousHomeUserSummaryQueries.forEach(([queryKey, previousData]) => {
          queryClient.setQueryData(queryKey, previousData);
        });
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
      queryClient.invalidateQueries({ queryKey: ["homePublicBootstrap"] });
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
      queryClient.invalidateQueries({ queryKey: ["homePublicBootstrap"] });
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
