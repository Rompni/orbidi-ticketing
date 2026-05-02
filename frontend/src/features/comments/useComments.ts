import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { commentsApi } from "../../api/comments";

export function useComments(ticketId: number) {
  return useQuery({
    queryKey: ["comments", ticketId],
    queryFn: () => commentsApi.list(ticketId),
  });
}

export function useCreateComment(ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => commentsApi.create(ticketId, { body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["comments", ticketId] }),
  });
}
