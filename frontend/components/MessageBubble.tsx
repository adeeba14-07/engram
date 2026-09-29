"use client";
import { useState } from "react";
import { fmt } from "@/lib/format";
import type { ApiMessage, Outcome, Recall } from "@/lib/types";
import RecallBox from "./RecallBox";

export type Preview = { url: string; type: "image" | "video" };

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: "worked", label: "✅ Worked" },
  { value: "failed", label: "❌ Didn't work" },
  { value: "unsure", label: "🤷 Not sure" },
];

const PencilIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
const TrashIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>;
const iconBtn = "rounded-md p-1.5 text-ink-muted hover:bg-subtle hover:text-ink";
// Always visible on touch screens; on desktop appear on hover.
const actions = "flex gap-0.5 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100";

function Media({ m, preview }: { m: ApiMessage; preview?: Preview }) {
  const type = preview?.type ?? m.media_type;
  if (!type) return null;
  return (
    <div className="mb-2">
      {preview?.type === "image" && /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview.url} alt="Attachment" className="max-h-56 rounded-lg" />}
      {preview?.type === "video" && <video src={preview.url} controls className="max-h-56 rounded-lg" />}
      {!preview && <p className="text-xs opacity-80">📎 {type} attached</p>}
      {type === "video" && <p className="mt-1 text-xs opacity-80">(video analysis coming soon)</p>}
    </div>
  );
}

export default function MessageBubble({ m, preview, recall, pending, onEdit, onDelete, onOutcome }: {
  m: ApiMessage; preview?: Preview; recall?: Recall; pending?: boolean;
  onEdit: (id: ApiMessage["id"], content: string) => void;
  onDelete: (id: ApiMessage["id"]) => void;
  onOutcome: (id: ApiMessage["id"], v: Outcome) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.content);

  if (m.role === "user")
    return (
      <div className="group flex flex-col items-end gap-1">
        {editing ? (
          <div className="w-full max-w-[85%] space-y-2 sm:max-w-[70%]">
            <textarea className="input min-h-[80px] w-full" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
            <div className="flex justify-end gap-2">
              <button className="btn-outline !px-3 !py-1.5" onClick={() => { setEditing(false); setDraft(m.content); }}>Cancel</button>
              <button className="btn-primary !px-3 !py-1.5" onClick={() => { if (draft.trim()) { onEdit(m.id, draft.trim()); setEditing(false); } }}>Save</button>
            </div>
          </div>
        ) : (
          <div className="flex max-w-[85%] items-start gap-1 sm:max-w-[70%]">
            {!pending && (
              <div className={`${actions} mt-1`}>
                <button className={iconBtn} aria-label="Edit message" title="Edit" onClick={() => { setDraft(m.content); setEditing(true); }}><PencilIcon /></button>
                <button className={iconBtn} aria-label="Delete message" title="Delete" onClick={() => onDelete(m.id)}><TrashIcon /></button>
              </div>
            )}
            <div className="whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-brand px-4 py-2.5 text-sm text-white dark:text-[#0b0e1e]">
              <Media m={m} preview={preview} />
              {m.content}
            </div>
          </div>
        )}
        <span className="text-[11px] text-faint">{fmt(m.created_at)}</span>
      </div>
    );

  return (
    <div className="group flex items-start gap-3">
      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft" aria-hidden>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--brand))" strokeWidth="2" strokeLinecap="round"><rect x="4" y="7" width="16" height="12" rx="4" /><path d="M12 3v4M9 12v1.5M15 12v1.5" /></svg>
      </div>
      <div className="flex max-w-[85%] flex-col items-start gap-2 sm:max-w-[75%]">
        <div className="flex items-start gap-1">
          <div className="whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-bubble px-4 py-3 text-sm leading-relaxed">{m.content}</div>
          <div className={`${actions} mt-1`}>
            <button className={iconBtn} aria-label="Delete message" title="Delete" onClick={() => onDelete(m.id)}><TrashIcon /></button>
          </div>
        </div>
        <RecallBox recall={recall} usedMemories={m.used_memories} explanation={m.recall_explanation} />
        <div className="flex flex-wrap items-center gap-2">
          {OUTCOMES.map((o) => {
            const chosen = m.outcome === o.value;
            return (
              <button key={o.value} disabled={!!m.outcome} onClick={() => onOutcome(m.id, o.value)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${chosen
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-line text-ink-muted hover:bg-subtle disabled:opacity-40 disabled:hover:bg-transparent"}`}>
                {o.label}
              </button>
            );
          })}
          <span className="text-[11px] text-faint">{fmt(m.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
