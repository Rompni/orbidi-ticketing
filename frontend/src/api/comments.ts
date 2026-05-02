import { api } from "../lib/api";

export interface CommentAuthor {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
}

export interface Comment {
  id: number;
  ticket_id: number;
  body: string;
  author: CommentAuthor;
  created_at: string;
  updated_at: string;
}

export const commentsApi = {
  list: (ticketId: number) =>
    api.get<Comment[]>(`/tickets/${ticketId}/comments`).then((r) => r.data),

  create: (ticketId: number, data: { body: string }) =>
    api.post<Comment>(`/tickets/${ticketId}/comments`, data).then((r) => r.data),

  remove: (ticketId: number, id: number) =>
    api.delete(`/tickets/${ticketId}/comments/${id}`),
};
