import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attachmentsApi } from "../../api/attachments";

export function useAttachments(ticketId: number) {
  return useQuery({
    queryKey: ["attachments", ticketId],
    queryFn: () => attachmentsApi.list(ticketId),
  });
}

export function useUploadAttachment(ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => attachmentsApi.upload(ticketId, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attachments", ticketId] }),
  });
}

export function useDeleteAttachment(ticketId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) => attachmentsApi.remove(ticketId, attachmentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attachments", ticketId] }),
  });
}
