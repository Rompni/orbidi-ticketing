import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnResizeMode,
  type ColumnSizingState,
} from "@tanstack/react-table";

const SIZING_KEY = "tickets-table-sizing";

function loadSizing(): ColumnSizingState {
  try {
    return JSON.parse(localStorage.getItem(SIZING_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveSizing(sizing: ColumnSizingState) {
  localStorage.setItem(SIZING_KEY, JSON.stringify(sizing));
}
import { useTickets, useCreateTicket } from "../features/tickets/useTickets";
import { type Ticket, type TicketStatus, type TicketPriority } from "../api/tickets";
import { StatusBadge } from "../components/StatusBadge";
import { PriorityBadge } from "../components/PriorityBadge";

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return <img src={url} alt={name} className="w-6 h-6 rounded-full object-cover" />;
  }
  return (
    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-500 uppercase">
      {name[0]}
    </div>
  );
}

function UserCell({ name, url }: { name: string; url: string | null }) {
  return (
    <div className="flex items-center gap-2 max-w-[120px]">
      <Avatar name={name} url={url} />
      <span className="text-slate-600 truncate">{name}</span>
    </div>
  );
}

const col = createColumnHelper<Ticket>();

const columns = [
  col.accessor("id", {
    header: "#",
    size: 52,
    minSize: 40,
    maxSize: 80,
    cell: (info) => (
      <span className="text-slate-400 font-mono text-xs">{info.getValue()}</span>
    ),
  }),
  col.accessor("title", {
    header: "Título",
    size: 480,
    minSize: 120,
    cell: (info) => (
      <span className="font-semibold text-slate-800 text-base leading-snug block truncate">
        {info.getValue()}
      </span>
    ),
  }),
  col.accessor("status", {
    header: "Estado",
    size: 120,
    minSize: 80,
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  col.accessor("priority", {
    header: "Prioridad",
    size: 100,
    minSize: 80,
    cell: (info) => <PriorityBadge priority={info.getValue()} />,
  }),
  col.accessor("author", {
    header: "Autor",
    size: 140,
    minSize: 80,
    cell: (info) => (
      <UserCell name={info.getValue().name} url={info.getValue().avatar_url} />
    ),
  }),
  col.accessor("assignee", {
    header: "Asignado",
    size: 140,
    minSize: 80,
    cell: (info) => {
      const a = info.getValue();
      return a ? (
        <UserCell name={a.name} url={a.avatar_url} />
      ) : (
        <span className="text-slate-300 text-xs">Sin asignar</span>
      );
    },
  }),
  col.accessor("created_at", {
    header: "Creado",
    size: 110,
    minSize: 80,
    cell: (info) => (
      <span className="text-slate-400 text-xs tabular-nums">
        {new Date(info.getValue()).toLocaleDateString("es", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </span>
    ),
  }),
];

function SortIcon({ dir }: { dir: false | "asc" | "desc" }) {
  return (
    <svg
      className={`ml-1 w-3 h-3 flex-shrink-0 transition-colors ${dir ? "text-slate-600" : "text-slate-300 group-hover:text-slate-400"}`}
      viewBox="0 0 8 12"
      fill="currentColor"
    >
      {dir !== "desc" && <path d="M4 0L7 4H1L4 0Z" />}
      {dir !== "asc" && <path d="M4 12L1 8H7L4 12Z" />}
    </svg>
  );
}

const columnResizeMode: ColumnResizeMode = "onChange";

export default function TicketsPage({ onTicketClick }: { onTicketClick: (id: number) => void }) {
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "">("");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "">("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(loadSizing);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const { data, isLoading } = useTickets({
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
  });

  const createTicket = useCreateTicket();

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    columnResizeMode,
    state: { sorting, columnSizing },
    onSortingChange: setSorting,
    onColumnSizingChange: (updater) => {
      const next = typeof updater === "function" ? updater(columnSizing) : updater;
      setColumnSizing(next);
      saveSizing(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createTicket.mutateAsync({ title: newTitle.trim() });
    setNewTitle("");
    setShowForm(false);
  }

  const selectClass =
    "text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Tickets</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {data?.total ?? 0} ticket{(data?.total ?? 0) !== 1 ? "s" : ""} en total
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
        >
          <span className="text-lg leading-none">+</span>
          Nuevo ticket
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              autoFocus
              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
              placeholder="Título del ticket…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <button
              type="submit"
              disabled={createTicket.isPending}
              className="text-sm bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {createTicket.isPending ? "Creando…" : "Crear"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-slate-500 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          className={selectClass}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TicketStatus | "")}
        >
          <option value="">Todos los estados</option>
          <option value="open">Abierto</option>
          <option value="in_progress">En progreso</option>
          <option value="in_review">En revisión</option>
          <option value="closed">Cerrado</option>
        </select>

        <select
          className={selectClass}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | "")}
        >
          <option value="">Todas las prioridades</option>
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
          <option value="urgent">Urgente</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-12 text-center text-slate-400 text-sm">
          Cargando tickets…
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="text-sm"
              style={{ width: table.getTotalSize(), tableLayout: "fixed" }}
            >
              <thead>
                <tr className="border-b border-slate-100">
                  {table.getHeaderGroups()[0].headers.map((header) => (
                    <th
                      key={header.id}
                      className="group relative px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider select-none"
                      style={{ width: header.getSize() }}
                    >
                      <span
                        className="flex items-center cursor-pointer hover:text-slate-600 transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <SortIcon dir={header.column.getIsSorted()} />
                      </span>

                      {/* Resize handle */}
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none
                          ${header.column.getIsResizing()
                            ? "bg-slate-400"
                            : "bg-transparent hover:bg-slate-200"
                          }`}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="px-4 py-12 text-center text-slate-400 text-sm"
                    >
                      No hay tickets
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => onTicketClick(row.original.id)}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-4 py-3.5 overflow-hidden"
                          style={{ width: cell.column.getSize(), maxWidth: cell.column.getSize() }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
