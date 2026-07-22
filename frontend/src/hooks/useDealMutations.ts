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
  updateDealCaches,
  rollbackDealCaches,
  findDealInCache,
  toSavedDealSignal,
} from "./_dealCacheUtils";

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
