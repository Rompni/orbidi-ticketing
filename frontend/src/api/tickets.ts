import { api } from "../lib/api";

export type TicketStatus = "open" | "in_progress" | "in_review" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  author: User;
  assignee: User | null;
  created_at: string;
  updated_at: string;
}

export interface TicketList {
  items: Ticket[];
  total: number;
}

export interface ListParams {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignee_id?: number;
  offset?: number;
  limit?: number;
}

export interface TicketCreate {
  title: string;
  description?: string;
  priority?: TicketPriority;
  assignee_id?: number;
}

export interface TicketUpdate {
  title?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignee_id?: number | null;
}

export const ticketsApi = {
  list: (params?: ListParams) =>
    api.get<TicketList>("/tickets", { params }).then((r) => r.data),

  get: (id: number) =>
    api.get<Ticket>(`/tickets/${id}`).then((r) => r.data),

  create: (data: TicketCreate) =>
    api.post<Ticket>("/tickets", data).then((r) => r.data),

  update: (id: number, data: TicketUpdate) =>
    api.patch<Ticket>(`/tickets/${id}`, data).then((r) => r.data),

  remove: (id: number) =>
    api.delete(`/tickets/${id}`),
};
