import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import api from "@/lib/api";

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
