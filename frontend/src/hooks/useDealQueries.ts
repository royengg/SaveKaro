import {
  useQuery,
  useInfiniteQuery,
  type InfiniteData,
} from "@tanstack/react-query";
import api from "@/lib/api";
import type { DealRegion } from "@/store/filterStore";
import {
  type DealsResponse,
  type HomeBootstrapResponse,
  type DealResponse,
  type PriceHistoryResponse,
  DEALS_PAGE_LIMIT,
  DEALS_MAX_PAGES,
  AMAZON_DEALS_FETCH_LIMIT,
  STORE_SHOWCASE_FETCH_LIMIT,
} from "./_dealCacheUtils";

export function useDeals(params?: {
  category?: string | null;
  store?: string | null;
  minDiscount?: number | null;
  search?: string;
  sortBy?: "newest" | "popular" | "discount";
  region?: DealRegion;
  limit?: number;
  maxPages?: number;
  retainAllPages?: boolean;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  refetchOnWindowFocus?: boolean;
  initialData?: InfiniteData<DealsResponse, number>;
}) {
  const queryKeyParams = {
    category: params?.category ?? null,
    store: params?.store ?? null,
    minDiscount: params?.minDiscount ?? null,
    search: params?.search ?? "",
    sortBy: params?.sortBy ?? "newest",
    region: params?.region ?? null,
    limit: params?.limit ?? DEALS_PAGE_LIMIT,
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
        limit: params?.limit ?? DEALS_PAGE_LIMIT,
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
    staleTime: params?.staleTime,
    gcTime: params?.gcTime,
    refetchOnWindowFocus: params?.refetchOnWindowFocus,
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
