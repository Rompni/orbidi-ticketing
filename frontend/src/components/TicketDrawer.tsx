import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from "react";
import { useTicket, usePatchTicket } from "../features/tickets/useTickets";
import { useComments, useCreateComment } from "../features/comments/useComments";
import { useAttachments, useUploadAttachment } from "../features/attachments/useAttachments";
import { useUsers } from "../features/users/useUsers";
import { attachmentsApi, type Attachment } from "../api/attachments";
import { type Comment } from "../api/comments";
import { type TicketStatus, type TicketPriority } from "../api/tickets";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString("es", { day: "2-digit", month: "short" });
}

// ─── sub-components ──────────────────────────────────────────────────────────

function Avatar({ name, url }: { name: string; url: string | null }) {
  const [errored, setErrored] = useState(false);
  if (url && !errored) {
    return <img src={url} alt={name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" onError={() => setErrored(true)} />;
  }
  return (
    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-500 uppercase flex-shrink-0">
      {name[0]}
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className="flex gap-2.5">
      <Avatar name={comment.author.name} url={comment.author.avatar_url} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-semibold text-slate-700">{comment.author.name}</span>
          <span className="text-[10px] text-slate-400">{timeAgo(comment.created_at)}</span>
        </div>
        <p className="text-sm text-slate-600 whitespace-pre-wrap">{comment.body}</p>
      </div>
    </div>
  );
}

function AttachmentItem({ ticketId, att }: { ticketId: number; att: Attachment }) {
  return (
    <a
      href={attachmentsApi.downloadUrl(ticketId, att.id)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors group"
    >
      <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="text-sm text-slate-700 truncate group-hover:text-slate-900 flex-1 min-w-0">
        {att.filename}
      </span>
      <span className="text-xs text-slate-400 flex-shrink-0">{formatBytes(att.size_bytes)}</span>
    </a>
  );
}

// ─── main body ───────────────────────────────────────────────────────────────

function DrawerBody({ ticketId, onClose }: { ticketId: number; onClose: () => void }) {
  const { data: ticket, isLoading } = useTicket(ticketId);
  const { data: comments = [], isLoading: commentsLoading } = useComments(ticketId);
  const { data: attachments = [], isLoading: attachmentsLoading } = useAttachments(ticketId);

  const patch = usePatchTicket();
  const createComment = useCreateComment(ticketId);
  const uploadAttachment = useUploadAttachment(ticketId);
  const { data: users = [] } = useUsers();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [newComment, setNewComment] = useState("");
  const titleRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title);
      setDescription(ticket.description);
    }
  }, [ticket]);

  useEffect(() => {
    if (!ticket) return;
    const prev = document.title;
    document.title = `#${ticket.id} ${ticket.title} — Orbidi Ticketing`;
    return () => { document.title = prev; };
  }, [ticket]);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  if (isLoading || !ticket) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Cargando…
      </div>
    );
  }

  const descDirty = description !== ticket.description;

  function handleTitleBlur() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === ticket.title) {
      setTitle(ticket.title);
      return;
    }
    patch.mutate({ id: ticket.id, data: { title: trimmed } });
  }

  function handleStatusChange(e: ChangeEvent<HTMLSelectElement>) {
    patch.mutate({ id: ticket.id, data: { status: e.target.value as TicketStatus } });
  }

  function handlePriorityChange(e: ChangeEvent<HTMLSelectElement>) {
    patch.mutate({ id: ticket.id, data: { priority: e.target.value as TicketPriority } });
  }

  function saveDescription() {
    patch.mutate({ id: ticket.id, data: { description } });
  }

  async function handleComment(e: FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    await createComment.mutateAsync(newComment.trim());
    setNewComment("");
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadAttachment.mutate(file);
    e.target.value = "";
  }

  const selectClass =
    "text-sm border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300";

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-200 flex-shrink-0">
        <span className="text-xs font-mono text-slate-400 flex-shrink-0 self-start pt-0.5">#{ticket.id}</span>
        <textarea
          ref={titleRef}
          rows={1}
          className="flex-1 text-base font-semibold text-slate-800 bg-transparent outline-none border border-transparent
            rounded px-1 focus:border-slate-200 focus:bg-slate-50 min-w-0 transition-colors resize-none overflow-hidden leading-snug"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}
        />
        <button
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex-shrink-0 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Metadata */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap gap-5">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Estado</span>
            <select value={ticket.status} onChange={handleStatusChange} className={selectClass}>
              <option value="open">Abierto</option>
              <option value="in_progress">En progreso</option>
              <option value="in_review">En revisión</option>
              <option value="closed">Cerrado</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Prioridad</span>
            <select value={ticket.priority} onChange={handlePriorityChange} className={selectClass}>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Autor</span>
            <div className="flex items-center gap-1.5 py-0.5">
              <Avatar name={ticket.author.name} url={ticket.author.avatar_url} />
              <span className="text-sm text-slate-700">{ticket.author.name}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Asignado</span>
            <select
              value={ticket.assignee?.id ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                patch.mutate({
                  id: ticket.id,
                  data: { assignee_id: val ? Number(val) : null },
                });
              }}
              className={selectClass}
            >
              <option value="">Sin asignar</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Creado</span>
            <span className="text-sm text-slate-600 py-0.5">
              {new Date(ticket.created_at).toLocaleDateString("es", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="px-5 py-4 border-b border-slate-100">
          <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Descripción
          </h4>
          <textarea
            className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2
              resize-none focus:outline-none focus:ring-2 focus:ring-slate-300 min-h-[96px] transition-colors"
            placeholder="Agrega una descripción…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {descDirty && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={saveDescription}
                disabled={patch.isPending}
                className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-700 disabled:opacity-50 transition-colors"
              >
                {patch.isPending ? "Guardando…" : "Guardar"}
              </button>
              <button
                onClick={() => setDescription(ticket.description)}
                className="text-xs text-slate-500 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="px-5 py-4 border-b border-slate-100">
          <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Comentarios{comments.length > 0 && ` (${comments.length})`}
          </h4>
          {commentsLoading ? (
            <p className="text-xs text-slate-400">Cargando…</p>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => (
                <CommentItem key={c.id} comment={c} />
              ))}
            </div>
          )}
          <form onSubmit={handleComment} className="mt-4 flex flex-col gap-2">
            <textarea
              className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2
                resize-none focus:outline-none focus:ring-2 focus:ring-slate-300 min-h-[72px] transition-colors"
              placeholder="Escribe un comentario… (Ctrl+Enter para enviar)"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || createComment.isPending}
              className="self-start text-xs bg-slate-900 text-white px-3 py-1.5 rounded-md
                hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {createComment.isPending ? "Enviando…" : "Comentar"}
            </button>
          </form>
        </div>

        {/* Attachments */}
        <div className="px-5 py-4">
          <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">
            Adjuntos{attachments.length > 0 && ` (${attachments.length})`}
          </h4>
          {attachmentsLoading ? (
            <p className="text-xs text-slate-400">Cargando…</p>
          ) : (
            <div className="space-y-2 mb-3">
              {attachments.map((att) => (
                <AttachmentItem key={att.id} ticketId={ticketId} att={att} />
              ))}
            </div>
          )}
          <label
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border cursor-pointer transition-colors
              ${uploadAttachment.isPending
                ? "bg-slate-50 text-slate-400 border-slate-200 cursor-wait"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {uploadAttachment.isPending ? "Subiendo…" : "Subir archivo"}
            <input
              type="file"
              className="hidden"
              onChange={handleFileChange}
              disabled={uploadAttachment.isPending}
            />
          </label>
        </div>
      </div>
    </>
  );
}

// ─── drawer shell ────────────────────────────────────────────────────────────

export function TicketDrawer({
  ticketId,
  onClose,
}: {
  ticketId: number | null;
  onClose: () => void;
}) {
  const isOpen = ticketId !== null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />
      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-2xl bg-white shadow-xl flex flex-col
          transition-transform duration-200 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {ticketId !== null && <DrawerBody ticketId={ticketId} onClose={onClose} />}
      </div>
    </>
  );
}
