import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import api from "@/lib/api";

interface CommentsPage {
  success: boolean;
  data: unknown[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useComments(dealId: string) {
  const query = useInfiniteQuery<
    CommentsPage,
    Error,
    InfiniteData<CommentsPage>,
    readonly [string, string],
    number
  >({
    queryKey: ["comments", dealId],
    queryFn: async ({ pageParam, signal }) => {
      return (await api.getComments(dealId, pageParam, 20, signal)) as CommentsPage;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    enabled: !!dealId,
  });

  return {
    ...query,
    data: query.data?.pages.flatMap((page) => page.data),
    total: query.data?.pages[0]?.pagination.total ?? 0,
  };
}

export function useCommentReplies(parentId: string, enabled: boolean) {
  const query = useInfiniteQuery<
    CommentsPage,
    Error,
    InfiniteData<CommentsPage>,
    readonly [string, string],
    number
  >({
    queryKey: ["commentReplies", parentId],
    queryFn: async ({ pageParam, signal }) => {
      return (await api.getCommentReplies(
        parentId,
        pageParam,
        50,
        signal,
      )) as CommentsPage;
    },
    initialPageParam: 2,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    enabled,
    staleTime: 1000 * 60,
  });

  return {
    ...query,
    data: query.data?.pages.flatMap((page) => page.data),
  };
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
    onSuccess: (_, { dealId, parentId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", dealId] });
      queryClient.invalidateQueries({ queryKey: ["deal", dealId] });
      if (parentId) {
        queryClient.invalidateQueries({
          queryKey: ["commentReplies", parentId],
        });
      }
    },
  });
}
