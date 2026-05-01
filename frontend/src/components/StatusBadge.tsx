import { type TicketStatus } from "../api/tickets";

const styles: Record<TicketStatus, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  in_review: "bg-purple-100 text-purple-700",
  closed: "bg-slate-100 text-slate-500",
};

const labels: Record<TicketStatus, string> = {
  open: "Abierto",
  in_progress: "En progreso",
  in_review: "En revisión",
  closed: "Cerrado",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
