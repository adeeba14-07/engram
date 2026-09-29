"use client";
import { useState } from "react";
import { fmt } from "@/lib/format";
import type { ApiMessage, Fact } from "@/lib/types";

const EMPTY = "Nothing yet. Ask Engram something and it'll remember.";
const seg = (on: boolean) => `rounded-md px-3 py-1 text-xs font-medium ${on ? "bg-brand text-white dark:text-[#0b0e1e]" : "text-ink-muted hover:bg-subtle"}`;

function Card({ m, query }: { m: ApiMessage; query?: string }) {
  const [open, setOpen] = useState(false);
  const isUser = m.role === "user";
  return (
    <li className="rounded-xl border border-line bg-surface p-4 text-sm">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${isUser ? "bg-brand-soft text-brand" : "bg-subtle text-ink-muted"}`}>{isUser ? "You" : "Engram"}</span>
        <span className="text-xs text-faint">{fmt(m.created_at)}</span>
      </div>
      <p className="whitespace-pre-wrap">{m.content}</p>
      {!isUser && (m.recall_explanation || query) && (
        <div className="mt-2">
          <button onClick={() => setOpen((o) => !o)} className="text-xs font-medium text-brand">why? {open ? "▴" : "▾"}</button>
          {open && (
            <div className="mt-1.5 space-y-1 whitespace-pre-wrap rounded-lg bg-subtle p-2.5 text-xs text-ink-muted">
              {query && <p>Query: “{query}”</p>}
              {m.recall_explanation && <p>{m.recall_explanation}</p>}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default function TimelineView({ messages, facts, queries = {} }: { messages: ApiMessage[]; facts: Fact[]; queries?: Record<string, string> }) {
  const [scope, setScope] = useState<"chat" | "all">("chat");
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const has = (s?: string | null) => !!s && s.toLowerCase().includes(term);

  const cards = messages.filter((m) => !term || has(m.content) || has(m.recall_explanation) || has(queries[String(m.id)]));
  const allFacts = [...facts].sort((a, b) => +new Date(a.when) - +new Date(b.when)).filter((f) => !term || has(f.text));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 border-b border-line px-4 py-3 sm:px-8">
        <div className="inline-flex gap-1 rounded-lg border border-line p-0.5">
          <button className={seg(scope === "chat")} onClick={() => setScope("chat")}>This chat</button>
          <button className={seg(scope === "all")} onClick={() => setScope("all")}>All chats</button>
        </div>
        <input className="input" placeholder="Filter by keyword..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8">
        {scope === "chat" ? (
          cards.length === 0
            ? <p className="mt-10 text-center text-sm text-ink-muted">{messages.length === 0 ? EMPTY : "No messages match that keyword."}</p>
            : <ul className="space-y-3">{cards.map((m) => <Card key={m.id} m={m} query={queries[String(m.id)]} />)}</ul>
        ) : (
          allFacts.length === 0
            ? <p className="mt-10 text-center text-sm text-ink-muted">{facts.length === 0 ? EMPTY : "No memories match that keyword."}</p>
            : <ol className="space-y-4 border-l border-line pl-4">
                {allFacts.map((f, i) => (
                  <li key={i} className="relative text-sm">
                    <span className="absolute -left-[21px] top-1.5 text-faint" aria-hidden>•</span>
                    <p className="text-xs text-ink-muted">{fmt(f.when)}</p>
                    <p>{f.text}</p>
                  </li>
                ))}
              </ol>
        )}
      </div>
    </div>
  );
}
