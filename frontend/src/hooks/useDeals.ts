// Barrel re-export — consumers can continue importing from "@/hooks/useDeals" unchanged.

export {
  useDeals,
  useHomeBootstrap,
  useAmazonDeals,
  useStoreDeals,
  useDeal,
  useDealPriceHistory,
} from "./useDealQueries";

export {
  useVoteDeal,
  useSaveDeal,
  useDeleteDeal,
  useCreateDeal,
  useTrackClick,
} from "./useDealMutations";

export { useComments, useCommentReplies, useCreateComment } from "./useComments";

export {
  useCategories,
  useHomeUserSummary,
  useUnreadNotificationCount,
  useSavedSignals,
  useSavedDeals,
  useUserStats,
  useNotifications,
} from "./useUserData";

export type {
  SavedDealSignal,
  HomeUserSummary,
  NotificationItem,
  NotificationsResponse,
} from "./_dealCacheUtils";
