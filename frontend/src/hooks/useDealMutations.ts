import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import api from "@/lib/api";
import type { Deal } from "@/store/filterStore";
import {
  type DealsResponse,
  type VoteResponse,
  type SaveResponse,
  type VoteMutationContext,
  type SaveMutationContext,
  type HomeUserSummary,
  type SavedDealSignal,
  updateDealCaches,
  rollbackDealCaches,
  findDealInCache,
  toSavedDealSignal,
} from "./_dealCacheUtils";

function updateSavedDealPages(
  current: InfiniteData<DealsResponse> | undefined,
  dealId: string,
  saved: boolean,
) {
  if (!current) return current;
  const exists = current.pages.some((page) =>
    page.data.some((deal) => deal.id === dealId),
  );
  // Do not prepend a new row into an offset-paginated cache: doing so shifts
  // every later page and can duplicate the boundary row. The settled
  // invalidation below retrieves the server's canonical page boundaries.
  if (saved && !exists) return current;
  const totalDelta = !saved && exists ? -1 : 0;

  return {
    ...current,
    pages: current.pages.map((page) => ({
      ...page,
      data: saved
        ? page.data.some((deal) => deal.id === dealId)
          ? page.data.map((deal) =>
              deal.id === dealId ? { ...deal, userSaved: true } : deal,
            )
          : page.data
        : page.data.filter((deal) => deal.id !== dealId),
      pagination: {
        ...page.pagination,
        total: Math.max(0, page.pagination.total + totalDelta),
      },
    })),
  };
}

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
      const previousSavedDealQueries =
        queryClient.getQueriesData<InfiniteData<DealsResponse>>({
          queryKey: ["savedDeals"],
        });

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

      return {
        previousDealQueries,
        previousDealDetail,
        previousSavedDealQueries,
      };
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
      const previousSavedDealQueries =
        queryClient.getQueriesData<InfiniteData<DealsResponse>>({
          queryKey: ["savedDeals"],
        });
      const previousHomeUserSummaryQueries =
        queryClient.getQueriesData<HomeUserSummary>({
          queryKey: ["homeUserSummary"],
        });
      const previousSavedSignalQueries =
        queryClient.getQueriesData<SavedDealSignal[]>({
          queryKey: ["savedSignals"],
        });
      const cachedDeal = findDealInCache(queryClient, id);

      updateDealCaches(queryClient, id, (deal) => ({
        ...deal,
        userSaved: !deal.userSaved,
      }));

      queryClient.setQueriesData<InfiniteData<DealsResponse> | undefined>(
        { queryKey: ["savedDeals"] },
        (oldSaved) => {
          const exists = Boolean(
            oldSaved?.pages.some((page) =>
              page.data.some((deal) => deal.id === id),
            ),
          );
          return updateSavedDealPages(oldSaved, id, !exists);
        },
      );

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

      queryClient.setQueriesData<SavedDealSignal[] | undefined>(
        { queryKey: ["savedSignals"] },
        (current) => {
          if (!current) return current;
          const hasSignal = current.some((signal) => signal.id === id);
          if (hasSignal) return current.filter((signal) => signal.id !== id);
          if (!cachedDeal) return current;
          return [toSavedDealSignal(cachedDeal), ...current];
        },
      );

      return {
        previousDealQueries,
        previousDealDetail,
        previousSavedDealQueries,
        previousHomeUserSummaryQueries,
        previousSavedSignalQueries,
      };
    },
    onSuccess: (response, id) => {
      const { saved } = response.data;
      const cachedDeal = findDealInCache(queryClient, id);

      updateDealCaches(queryClient, id, (deal) => ({
        ...deal,
        userSaved: saved,
      }));

      queryClient.setQueriesData<InfiniteData<DealsResponse> | undefined>(
        { queryKey: ["savedDeals"] },
        (oldSaved) => updateSavedDealPages(oldSaved, id, saved),
      );

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

      queryClient.setQueriesData<SavedDealSignal[] | undefined>(
        { queryKey: ["savedSignals"] },
        (current) => {
          if (!current) return current;
          const hasSignal = current.some((signal) => signal.id === id);
          if (!saved) {
            return hasSignal ? current.filter((signal) => signal.id !== id) : current;
          }
          if (hasSignal || !cachedDeal) return current;
          return [toSavedDealSignal(cachedDeal), ...current];
        },
      );
    },
    onError: (_, variables, context) => {
      rollbackDealCaches(queryClient, variables, context);
      if (context) {
        context.previousHomeUserSummaryQueries.forEach(([queryKey, previousData]) => {
          queryClient.setQueryData(queryKey, previousData);
        });
        context.previousSavedSignalQueries.forEach(([queryKey, previousData]) => {
          queryClient.setQueryData(queryKey, previousData);
        });
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["savedDeals"] });
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
