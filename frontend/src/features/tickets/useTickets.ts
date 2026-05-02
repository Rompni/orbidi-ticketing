import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ticketsApi,
  type ListParams,
  type TicketCreate,
  type TicketUpdate,
  type TicketStatus,
  type TicketList,
} from "../../api/tickets";

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

export function usePatchTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: TicketUpdate }) =>
      ticketsApi.update(id, data),
    onSuccess: (_result, { id }) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["tickets", id] });
    },
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: TicketStatus }) =>
      ticketsApi.update(id, { status }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["tickets"] });
      const snapshots = qc.getQueriesData<TicketList>({ queryKey: ["tickets"] });
      qc.setQueriesData<TicketList>({ queryKey: ["tickets"] }, (old) => {
        if (!old) return old;
        return { ...old, items: old.items.map((t) => (t.id === id ? { ...t, status } : t)) };
      });
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  });
}
