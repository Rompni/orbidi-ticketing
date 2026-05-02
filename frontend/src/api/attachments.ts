import { api } from "../lib/api";

export interface AttachmentUploader {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
}

export interface Attachment {
  id: number;
  ticket_id: number;
  filename: string;
  mime_type: string;
  size_bytes: number;
  uploader: AttachmentUploader;
  created_at: string;
}

export const attachmentsApi = {
  list: (ticketId: number) =>
    api.get<Attachment[]>(`/tickets/${ticketId}/attachments`).then((r) => r.data),

  upload: (ticketId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<Attachment>(`/tickets/${ticketId}/attachments`, form).then((r) => r.data);
  },

  remove: (ticketId: number, id: number) =>
    api.delete(`/tickets/${ticketId}/attachments/${id}`),

  downloadUrl: (ticketId: number, id: number) =>
    `${import.meta.env.VITE_API_URL as string}/tickets/${ticketId}/attachments/${id}/download`,
};
