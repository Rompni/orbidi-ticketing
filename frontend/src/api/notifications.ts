import { api } from "../lib/api";

export type NotificationType = "assigned" | "commented" | "status_changed";

export interface Notification {
  id: number;
  type: NotificationType;
  ticket_id: number | null;
  payload: Record<string, string>;
  read_at: string | null;
  created_at: string;
}

export const notificationsApi = {
  list: () => api.get<Notification[]>("/notifications").then((r) => r.data),
  unreadCount: () =>
    api.get<{ count: number }>("/notifications/unread-count").then((r) => r.data),
  markRead: (id: number) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post("/notifications/mark-all-read"),
};
