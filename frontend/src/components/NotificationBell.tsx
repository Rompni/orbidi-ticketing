import { useState, useRef, useEffect } from "react";
import {
  useNotifications,
  useUnreadCount,
  useMarkAllRead,
} from "../features/notifications/useNotifications";
import { type Notification, type NotificationType } from "../api/notifications";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

function describe(type: NotificationType, payload: Record<string, string>): string {
  switch (type) {
    case "assigned":
      return `${payload.assigner} te asignó "${payload.ticket_title}"`;
    case "commented":
      return `${payload.commenter} comentó en "${payload.ticket_title}"`;
    case "status_changed":
      return `"${payload.ticket_title}" cambió a ${payload.new_status}`;
  }
}

function NotificationItem({
  n,
  onTicketClick,
  onClose,
}: {
  n: Notification;
  onTicketClick: (id: number) => void;
  onClose: () => void;
}) {
  function handleClick() {
    if (n.ticket_id) {
      onTicketClick(n.ticket_id);
      onClose();
    }
  }

  const unread = n.read_at === null;

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0
        ${unread ? "bg-blue-50/40" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        {unread ? (
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
        ) : (
          <div className="w-1.5 flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-xs text-slate-700 leading-snug">{describe(n.type, n.payload)}</p>
          <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
        </div>
      </div>
    </button>
  );
}

export function NotificationBell({
  onTicketClick,
}: {
  onTicketClick: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: countData } = useUnreadCount();
  const { data: notifications = [] } = useNotifications();
  const markAllRead = useMarkAllRead();

  const count = countData?.count ?? 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && count > 0) markAllRead.mutate();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        aria-label="Notificaciones"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-700">Notificaciones</span>
            {notifications.some((n) => n.read_at === null) && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Marcar leídas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">Sin notificaciones</p>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  onTicketClick={onTicketClick}
                  onClose={() => setOpen(false)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
