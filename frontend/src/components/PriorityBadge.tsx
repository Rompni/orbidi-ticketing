import { type TicketPriority } from "../api/tickets";

const styles: Record<TicketPriority, string> = {
  low: "bg-slate-100 text-slate-500",
  medium: "bg-green-100 text-green-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const labels: Record<TicketPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[priority]}`}>
      {labels[priority]}
    </span>
  );
}
