import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useTickets, useUpdateTicketStatus } from "../features/tickets/useTickets";
import { type Ticket, type TicketStatus } from "../api/tickets";
import { PriorityBadge } from "../components/PriorityBadge";

const COLUMNS: { id: TicketStatus; label: string; dot: string }[] = [
  { id: "open", label: "Abierto", dot: "bg-blue-500" },
  { id: "in_progress", label: "En progreso", dot: "bg-yellow-500" },
  { id: "in_review", label: "En revisión", dot: "bg-purple-500" },
  { id: "closed", label: "Cerrado", dot: "bg-slate-400" },
];

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return <img src={url} alt={name} className="w-5 h-5 rounded-full object-cover" />;
  }
  return (
    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-semibold text-slate-500 uppercase">
      {name[0]}
    </div>
  );
}

function CardContent({ ticket, overlay = false }: { ticket: Ticket; overlay?: boolean }) {
  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 p-3 select-none transition-shadow
        ${overlay
          ? "shadow-xl rotate-1 cursor-grabbing"
          : "shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing"
        }`}
    >
      <p className="text-sm font-medium text-slate-800 line-clamp-2 mb-2.5 leading-snug">
        {ticket.title}
      </p>
      <div className="flex items-center justify-between gap-2">
        <PriorityBadge priority={ticket.priority} />
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] text-slate-400 font-mono">#{ticket.id}</span>
          {ticket.assignee && (
            <Avatar name={ticket.assignee.name} url={ticket.assignee.avatar_url} />
          )}
        </div>
      </div>
    </div>
  );
}

function KanbanCard({ ticket, onTicketClick }: { ticket: Ticket; onTicketClick: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ticket.id,
    data: { ticket },
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onTicketClick(ticket.id)}
      className={isDragging ? "opacity-40" : ""}
    >
      <CardContent ticket={ticket} />
    </div>
  );
}

function KanbanColumn({
  col,
  tickets,
  onTicketClick,
}: {
  col: (typeof COLUMNS)[0];
  tickets: Ticket[];
  onTicketClick: (id: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div className="flex flex-col min-w-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`} />
        <h3 className="text-sm font-semibold text-slate-700">{col.label}</h3>
        <span className="ml-auto text-xs font-medium text-slate-400">{tickets.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl border-2 border-dashed p-2 space-y-2 min-h-[120px] transition-colors
          ${isOver ? "border-slate-400 bg-slate-100" : "border-slate-200 bg-slate-50/50"}`}
      >
        {tickets.map((ticket) => (
          <KanbanCard key={ticket.id} ticket={ticket} onTicketClick={onTicketClick} />
        ))}
      </div>
    </div>
  );
}

export default function KanbanPage({ onTicketClick }: { onTicketClick: (id: number) => void }) {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const { data, isLoading } = useTickets();
  const updateStatus = useUpdateTicketStatus();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const grouped = COLUMNS.reduce<Record<TicketStatus, Ticket[]>>(
    (acc, col) => {
      acc[col.id] = (data?.items ?? []).filter((t) => t.status === col.id);
      return acc;
    },
    { open: [], in_progress: [], in_review: [], closed: [] }
  );

  function handleDragStart(event: DragStartEvent) {
    const current = event.active.data.current as { ticket: Ticket } | undefined;
    setActiveTicket(current?.ticket ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTicket(null);
    const { active, over } = event;
    if (!over) return;
    const current = active.data.current as { ticket: Ticket } | undefined;
    if (!current) return;
    const newStatus = over.id as TicketStatus;
    if (current.ticket.status === newStatus) return;
    updateStatus.mutate({ id: current.ticket.id, status: newStatus });
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-12 text-center text-slate-400 text-sm">
        Cargando tickets…
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <KanbanColumn key={col.id} col={col} tickets={grouped[col.id]} onTicketClick={onTicketClick} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTicket ? <CardContent ticket={activeTicket} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
