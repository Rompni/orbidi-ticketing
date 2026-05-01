import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketsApi, type ListParams, type TicketCreate, type TicketUpdate } from "../../api/tickets";

export function useTickets(params?: ListParams) {
  return useQuery({
    queryKey: ["tickets", params],
    queryFn: () => ticketsApi.list(params),
  });
}

export function useTicket(id: number) {
  return useQuery({
    queryKey: ["tickets", id],
    queryFn: () => ticketsApi.get(id),
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TicketCreate) => ticketsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  });
}

export function useUpdateTicket(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TicketUpdate) => ticketsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  });
}

export function useDeleteTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ticketsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  });
}
