"use client";
import type { Chat, Id } from "@/lib/types";
import { fmt } from "@/lib/format";

export default function ChatSidebar({ chats, currentId, open, onClose, onSelect, onNew, onDelete }: {
  chats: Chat[]; currentId: Id | null; open: boolean; onClose: () => void;
  onSelect: (id: Id) => void; onNew: () => void; onDelete: (id: Id) => void;
}) {
  const sorted = [...chats].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
  // The server repeats "Chat N" numbers, so number those default titles here by creation order (1, 2, 3...).
  const oldestFirst = [...chats].sort((a, b) =>
    (+new Date(a.created_at) - +new Date(b.created_at)) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
  const label = (c: Chat) => {
    const t = (c.title ?? "").trim();
    if (!t || /^chat\s*\d+$/i.test(t)) return `Chat ${oldestFirst.findIndex((x) => x.id === c.id) + 1}`;
    return t;
  };
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} aria-hidden />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 transform flex-col border-r border-line bg-surface transition-transform md:static md:z-auto md:w-60 md:translate-x-0 md:shrink-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
          <h2 className="font-bold">Chats</h2>
          <button onClick={onNew} className="btn-primary !px-3 !py-1.5">＋ New chat</button>
        </div>
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {sorted.length === 0 && <li className="p-3 text-sm text-ink-muted">No chats yet.</li>}
          {sorted.map((c) => (
            <li key={c.id} className="group relative">
              <button onClick={() => onSelect(c.id)}
                className={`w-full rounded-lg px-3 py-2 pr-9 text-left text-sm transition hover:bg-subtle ${c.id === currentId ? "bg-brand-soft font-semibold text-brand" : ""}`}>
                <span className="block truncate">{label(c)}</span>
                <span className="block text-[11px] font-normal text-faint">{fmt(c.created_at)}</span>
              </button>
              <button onClick={() => onDelete(c.id)} aria-label="Delete chat" title="Delete chat"
                className="absolute right-1.5 top-2 rounded-md p-1.5 text-ink-muted opacity-100 hover:bg-line hover:text-ink md:opacity-0 md:group-hover:opacity-100">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}