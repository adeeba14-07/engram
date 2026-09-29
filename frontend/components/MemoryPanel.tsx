"use client";
import { useState } from "react";
import { cleanFactText, fmt } from "@/lib/format";
import type { Device, DeviceChange, Fact, Memory } from "@/lib/types";

export default function MemoryPanel({ device, changes, facts, recalled, open, onClose, memoryOff }: {
  memoryOff?: boolean;
  device: Device | null; changes: DeviceChange[]; facts: Fact[]; recalled: Memory[]; open: boolean; onClose: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const timeline = (() => {
    const seen = new Set<string>();
    return [...facts]
      .sort((a, b) => +new Date(b.when) - +new Date(a.when))
      .filter((f) => {
        const k = cleanFactText(f.text).toLowerCase();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 8);
  })();
  const rows: [string, string | number | null | undefined][] = device ? [
    ["Brand", device.brand], ["Model", device.model],
    ["OS", `${device.os_name} ${device.os_version}`.trim()],
    ["Age", device.age_months != null ? `${device.age_months} months` : null],
    ["RAM", device.ram_gb != null ? `${device.ram_gb} GB` : null],
    ["Storage", device.storage_gb != null ? `${device.storage_gb} GB` : null],
    ["GPU", device.gpu], ["CPU", device.cpu],
  ] : [];

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} aria-hidden />}
      <aside className={`fixed inset-y-0 right-0 z-40 flex w-[88%] max-w-sm transform flex-col overflow-y-auto bg-surface transition-transform lg:static lg:z-auto lg:w-[340px] lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:border-l lg:border-line ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between border-b border-line/60 px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mint-soft text-mint-fg" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </span>
            What Engram knows
          </h2>
          <button onClick={onClose} className="text-sm font-medium text-brand lg:hidden">Close</button>
        </div>

        <div className="space-y-6 p-5">
          {memoryOff && (
            <div role="status" className="rounded-xl border border-line bg-subtle px-3 py-2.5 text-sm font-medium text-ink-muted">
              🧠 Memory is off for this chat
            </div>
          )}
          <section>
            <h3 className="mb-3 text-sm font-bold">Device</h3>
            {device ? (
              <div className="rounded-xl border border-line/60 bg-subtle p-4 text-sm">
                <dl className="space-y-1">
                  {rows.filter(([, v]) => v != null && v !== "").map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-ink-muted">{k}</dt><dd className="text-right font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
                {device.os_updated_at && <p className="mt-2 text-xs text-ink-muted">OS updated {fmt(device.os_updated_at)}</p>}
              </div>
            ) : <p className="text-sm text-ink-muted">No device saved yet.</p>}

            <div className="mt-3">
              <button onClick={() => setShowHistory((s) => !s)} aria-expanded={showHistory} className="text-sm font-medium text-brand">
                History {showHistory ? "▴" : "▾"}
              </button>
              {showHistory && (
                changes.length === 0
                  ? <p className="mt-2 text-sm text-ink-muted">No changes yet.</p>
                  : <ul className="mt-2 space-y-2 text-sm">
                      {changes.map((c, i) => (
                        <li key={i} className="rounded-lg border border-line/60 p-2.5">
                          <p className="text-xs text-ink-muted">{c.field}</p>
                          <p>{c.old_value} → {c.new_value} · <span className="text-xs text-ink-muted">{fmt(c.changed_at)}</span></p>
                        </li>
                      ))}
                    </ul>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold">Timeline</h3>
            {timeline.length === 0 ? <p className="text-sm text-ink-muted">Memories appear here as you chat.</p> : (
              <ol className="space-y-4 border-l border-line pl-4">
                {timeline.map((f, i) => (
                  <li key={i} className="relative text-sm">
                    <span className="absolute -left-[21px] top-0 text-faint" aria-hidden>•</span>
                    <p className="text-xs text-ink-muted">{fmt(f.when)}</p>
                    <p>{cleanFactText(f.text)}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold">Recalled for this reply</h3>
            {recalled.length === 0 ? <p className="text-sm text-ink-muted">Send a message to see which memories shape the reply.</p> : (
              <ul className="space-y-2.5">
                {recalled.map((m, i) => (
                  <li key={`${m.id}-${i}`} className={`rounded-xl border p-3 text-sm ${m.used
                    ? "border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"
                    : "border-line bg-bubble text-ink-muted"}`}>
                    <p>{cleanFactText(m.text)}</p>
                    <p className="mt-1 text-xs opacity-75">• {fmt(m.when)}{m.score != null && ` · score ${m.score.toFixed(2)}`}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </aside>
    </>
  );
}
