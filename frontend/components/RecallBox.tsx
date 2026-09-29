"use client";
import { useState } from "react";
import type { Recall } from "@/lib/types";

type Item = { text: string; used?: boolean; score?: number };

// Accepts the live `recall` object from POST /chat, or the stored used_memories of an older message.
function normalize(x: unknown, defaultUsed?: boolean): Item[] {
  let v = x;
  if (typeof v === "string") {
    const raw: string = v;
    try { v = JSON.parse(raw); } catch { return raw.trim() ? [{ text: raw, used: defaultUsed }] : []; }
  }
  if (!Array.isArray(v)) return [];
  const out: Item[] = [];
  for (const i of v) {
    if (typeof i === "string") { if (i) out.push({ text: i, used: defaultUsed }); continue; }
    if (i && typeof i === "object") {
      const o = i as Record<string, unknown>;
      const text = String(o.text ?? o.memory ?? "");
      if (text) out.push({ text, used: typeof o.used === "boolean" ? o.used : defaultUsed, score: typeof o.score === "number" ? o.score : undefined });
    }
  }
  return out;
}

export default function RecallBox({ recall, usedMemories, explanation }: {
  recall?: Recall; usedMemories?: unknown; explanation?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const items = recall ? normalize(recall.matched) : normalize(usedMemories, true);
  if (!recall && items.length === 0 && !explanation) return null;

  const label = recall ? `Recalled ${recall.matched.length} of ${recall.total_in_bank}` : `Recalled ${items.length}`;

  return (
    <div className="text-xs">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md bg-mint-soft px-2.5 py-1 font-medium text-mint-fg">
        <span aria-hidden>🧠</span> {label}
        <span className="ml-1 text-ink-muted">why? {open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-xl border border-line bg-subtle p-3">
          {recall && <p><span className="text-ink-muted">Query:</span> “{recall.query}”</p>}
          {items.length > 0 && (
            <div>
              <p className="mb-1 text-ink-muted">Matched:</p>
              <ul className="space-y-1.5">
                {items.map((m, i) => (
                  <li key={i} className={`rounded-lg border px-2.5 py-1.5 ${m.used === true
                    ? "border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
                    : "border-line bg-bubble text-ink-muted"}`}>
                    • “{m.text}”{m.score != null && <span className="opacity-75"> — score {m.score.toFixed(2)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recall && <p className="text-ink-muted">Dropped: {recall.dropped} irrelevant {recall.dropped === 1 ? "memory" : "memories"}</p>}
          {explanation && <p className="whitespace-pre-wrap text-ink-muted">{explanation}</p>}
        </div>
      )}
    </div>
  );
}
