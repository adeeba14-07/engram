"use client";
import { useEffect, useRef, useState } from "react";
import MessageBubble, { Preview } from "./MessageBubble";
import type { ApiMessage, Id, Me, Outcome, Recall } from "@/lib/types";

export type Attachment = { dataUrl: string; base64: string; type: "image" | "video" };
const MAX_MB = 15;

const readFile = (file: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("Couldn't read that file."));
    r.readAsDataURL(file);
  });

export default function ChatPanel({ me, messages, previews, live, loading, onSend, onEdit, onDelete, onOutcome, notify, memoryEnabled = true }: {
  memoryEnabled?: boolean;
  me: Me | null; messages: ApiMessage[]; previews: Record<string, Preview>;
  live: { id: string; recall: Recall } | null; loading: boolean;
  onSend: (text: string, media: Attachment | null) => Promise<boolean>;
  onEdit: (id: Id, content: string) => void; onDelete: (id: Id) => void; onOutcome: (id: Id, v: Outcome) => void;
  notify: (msg: string) => void;
}) {
  const [text, setText] = useState("");
  const [attach, setAttach] = useState<Attachment | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const type = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null;
    if (!type) return notify("Please choose an image or a video.");
    if (file.size > MAX_MB * 1024 * 1024) return notify(`That file is too large (max ${MAX_MB} MB).`);
    try {
      const dataUrl = await readFile(file);
      setAttach({ dataUrl, base64: dataUrl.split(",")[1] ?? "", type });
    } catch (err) { notify((err as Error).message); }
  };

  const submit = async () => {
    if (loading) return;
    const t = text, a = attach;
    setText(""); setAttach(null);
    const ok = await onSend(t, a);
    if (!ok) { setText(t); setAttach(a); }
  };

  const d = me?.device;

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-8">
        {messages.length === 0 && !loading && (
          <div className="mx-auto mt-16 max-w-md text-center">
            <h2 className="text-xl font-bold">Hi {me?.name ?? "there"} 👋</h2>
            {d && <p className="mt-2 text-sm text-ink-muted">I know you're on {[d.brand, d.model].filter(Boolean).length ? `a ${[d.brand, d.model].filter(Boolean).join(" ")}` : "your laptop"} running {d.os_name} {d.os_version}.</p>}
            <p className="mt-1 text-sm text-ink-muted">What's going on today?</p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} m={m} preview={previews[String(m.id)]} pending={String(m.id).startsWith("tmp-")} memoryOff={!memoryEnabled && m.role !== "user"}
            recall={live && live.id === String(m.id) ? live.recall : undefined}
            onEdit={onEdit} onDelete={onDelete} onOutcome={onOutcome} />
        ))}
        {loading && (
          <div className="flex items-center gap-1.5 pl-12 text-sm text-ink-muted" aria-live="polite">
            Recalling memories
            {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${i * 0.15}s` }} />)}
          </div>
        )}
        <div ref={end} />
      </div>

      <div className="border-t border-line bg-surface px-4 py-3 sm:px-8">
        {attach && (
          <div className="mb-2 flex items-center gap-2">
            <div className="relative">
              {attach.type === "image"
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={attach.dataUrl} alt="Attachment preview" className="h-16 w-16 rounded-lg object-cover" />
                : <video src={attach.dataUrl} className="h-16 w-16 rounded-lg object-cover" />}
              <button onClick={() => setAttach(null)} aria-label="Remove attachment"
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-xs text-surface">×</button>
            </div>
            {attach.type === "video" && <span className="text-xs text-ink-muted">(video analysis coming soon)</span>}
          </div>
        )}
        <div className="flex items-center gap-3">
          <input ref={fileInput} type="file" accept="image/*,video/*" className="hidden" onChange={pick} />
          <button onClick={() => fileInput.current?.click()} aria-label="Attach image or video" title="Attach image or video"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line text-lg hover:bg-subtle">📎</button>
          <input className="input flex-1" placeholder="Type your message..." value={text}
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          <button onClick={submit} disabled={loading} aria-label="Send message" className="btn-primary h-10 w-11 !px-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" /></svg>
          </button>
        </div>
      </div>
    </section>
  );
}
