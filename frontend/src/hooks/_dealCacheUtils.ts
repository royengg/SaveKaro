import type {
  InfiniteData,
  QueryClient,
} from "@tanstack/react-query";
import type { Deal, Category, DealRegion } from "@/store/filterStore";

// --- Response types ---

export interface DealsResponse {
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

export interface HomeBootstrapResponse {
  success: boolean;
  data: {
    feed: DealsResponse;
    amazonDeals: Deal[];
    myntraDeals: Deal[];
  };
}

export interface PriceHistoryPoint {
  id: string;
  price: string;
  createdAt: string;
  source?: string;
}

export interface PriceHistoryResponse {
  success: boolean;
  data: PriceHistoryPoint[];
}

export interface CategoriesResponse {
  success: boolean;
  data: Category[];
}

export interface DealResponse {
  success: boolean;
  data: Deal;
}

export interface VoteResponse {
  success: boolean;
  data: {
    upvoteCount: number;
  };
}

export interface SaveResponse {
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

export interface HomeUserSummaryResponse {
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

// --- Mutation context types ---

export interface VoteMutationContext {
  previousDealQueries: Array<
    [readonly unknown[], InfiniteData<DealsResponse> | undefined]
  >;
  previousDealDetail: Deal | undefined;
  previousSavedDeals: Deal[] | undefined;
}

export interface SaveMutationContext extends VoteMutationContext {
  previousHomeUserSummaryQueries: Array<
    [readonly unknown[], HomeUserSummary | undefined]
  >;
}

// --- Constants ---

export const DEALS_PAGE_LIMIT = 20;
export const DEALS_MAX_PAGES = 12;
export const AMAZON_DEALS_FETCH_LIMIT = 18;
export const STORE_SHOWCASE_FETCH_LIMIT = 18;

// --- Cache helper functions ---

export const updateDealInInfiniteData = (
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

export const updateDealCaches = (
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

export const rollbackDealCaches = (
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

export const findDealInInfiniteData = (
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

export const findDealInCache = (queryClient: QueryClient, dealId: string) => {
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

export const toSavedDealSignal = (deal: Deal): SavedDealSignal => ({
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
