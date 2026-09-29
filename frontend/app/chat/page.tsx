"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import ChatPanel, { Attachment } from "@/components/ChatPanel";
import ChatSidebar from "@/components/ChatSidebar";
import Logo from "@/components/Logo";
import MemoryPanel from "@/components/MemoryPanel";
import type { Preview } from "@/components/MessageBubble";
import ThemeToggle from "@/components/ThemeToggle";
import TimelineView from "@/components/TimelineView";
import { useToast } from "@/components/Toast";
import { api, clearToken, getToken } from "@/lib/api";
import type { ApiMessage, Chat as ChatT, DeviceChange, Fact, Id, Me, Memory, Outcome, Recall } from "@/lib/types";

const sortChats = (l: ChatT[]) => [...l].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

export default function Chat() {
  const router = useRouter();
  const { toast, node } = useToast();
  const [me, setMe] = useState<Me | null>(null);
  const [chats, setChats] = useState<ChatT[]>([]);
  const [chatId, setChatId] = useState<Id | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [previews, setPreviews] = useState<Record<string, Preview>>({});
  const [live, setLive] = useState<{ id: string; recall: Recall } | null>(null);
  const [recalled, setRecalled] = useState<Memory[]>([]);
  const [queries, setQueries] = useState<Record<string, string>>({});
  const [facts, setFacts] = useState<Fact[]>([]);
  const [changes, setChanges] = useState<DeviceChange[]>([]);
  const [view, setView] = useState<"chat" | "timeline">("chat");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  const refreshSide = useCallback(async () => {
    const [mem, ch, m] = await Promise.allSettled([api.memory(), api.deviceChanges(), api.me()]);
    if (mem.status === "fulfilled") setFacts(mem.value.facts ?? []);
    if (ch.status === "fulfilled") setChanges(ch.value ?? []);
    if (m.status === "fulfilled") setMe(m.value);
  }, []);

  useEffect(() => {
    if (!getToken()) { router.replace("/login"); return; }
    (async () => {
      try {
        const m = await api.me();
        if (!m.device) { router.replace("/onboarding"); return; }
        setMe(m);
        let list = sortChats(await api.chats());
        if (list.length === 0) list = [await api.createChat()];
        setChats(list);
        setChatId(list[0].id);
        setMessages(await api.messages(list[0].id));
        refreshSide();
      } catch (e) { toast(errMsg(e)); }
      setReady(true);
    })();
  }, [router, toast, refreshSide]);

  // Re-fetch the current chat when opening the timeline so it is always up to date.
  useEffect(() => {
    if (view === "timeline" && chatId != null) api.messages(chatId).then(setMessages).catch((e) => toast(errMsg(e)));
  }, [view, chatId, toast]);

  const openChat = async (id: Id) => {
    setChatId(id); setLive(null); setRecalled([]); setSidebarOpen(false);
    try { setMessages(await api.messages(id)); } catch (e) { toast(errMsg(e)); }
  };

  const newChat = async () => {
    try {
      const c = await api.createChat();
      setChats((p) => sortChats([c, ...p]));
      setChatId(c.id); setMessages([]); setLive(null); setRecalled([]); setView("chat"); setSidebarOpen(false);
    } catch (e) { toast(errMsg(e)); }
  };

  const deleteChat = async (id: Id) => {
    if (!window.confirm("Delete this chat?")) return;
    try {
      await api.deleteChat(id);
      const rest = chats.filter((c) => c.id !== id);
      setChats(rest);
      if (id === chatId) {
        if (rest.length) await openChat(sortChats(rest)[0].id);
        else await newChat();
      }
    } catch (e) { toast(errMsg(e)); }
  };

  const send = async (text: string, media: Attachment | null): Promise<boolean> => {
    const body = text.trim();
    if (!body && !media) { toast("Type a message first."); return false; }

    let cid = chatId;
    if (cid == null) {
      try { const c = await api.createChat(); setChats((p) => [c, ...p]); setChatId(c.id); cid = c.id; }
      catch (e) { toast(errMsg(e)); return false; }
    }

    const tmpId = `tmp-${Date.now()}`;
    setMessages((p) => [...p, { id: tmpId, role: "user", content: body, media_type: media?.type ?? null, created_at: new Date().toISOString() }]);
    if (media) setPreviews((p) => ({ ...p, [tmpId]: { url: media.dataUrl, type: media.type } }));
    setView("chat");
    setLoading(true);
    try {
      const res = await api.chat({
        message: body || "See attached.", chat_id: cid,
        ...(media ? { media_base64: media.base64, media_type: media.type } : {}),
      });
      const finalId = res.chat_id ?? cid;
      if (finalId !== chatId) setChatId(finalId);
      // The reply carries no message ids, so reload the chat: edit / delete / outcome need them.
      const fresh = await api.messages(finalId);
      const lastUser = [...fresh].reverse().find((m) => m.role === "user");
      const lastReply = [...fresh].reverse().find((m) => m.role !== "user");
      setMessages(fresh);
      setPreviews((p) => {
        const { [tmpId]: pv, ...rest } = p;
        return pv && lastUser ? { ...rest, [String(lastUser.id)]: pv } : rest;
      });
      setLive(res.recall && lastReply ? { id: String(lastReply.id), recall: res.recall } : null);
      setRecalled(res.memories ?? []);
      if (res.recall && lastReply) setQueries((p) => ({ ...p, [String(lastReply.id)]: res.recall!.query }));
      api.chats().then((l) => setChats(sortChats(l))).catch(() => {});
      refreshSide();
      return true;
    } catch (e) {
      toast(errMsg(e));
      setMessages((p) => p.filter((m) => m.id !== tmpId));
      setPreviews((p) => { const { [tmpId]: _drop, ...rest } = p; return rest; });
      return false;
    } finally { setLoading(false); }
  };

  const editMessage = async (id: Id, content: string) => {
    try { await api.editMessage(id, content); setMessages((p) => p.map((m) => (m.id === id ? { ...m, content } : m))); }
    catch (e) { toast(errMsg(e)); }
  };
  const deleteMessage = async (id: Id) => {
    try { await api.deleteMessage(id); setMessages((p) => p.filter((m) => m.id !== id)); refreshSide(); }
    catch (e) { toast(errMsg(e)); }
  };
  const setOutcome = async (id: Id, value: Outcome) => {
    try { await api.setOutcome(id, value); setMessages((p) => p.map((m) => (m.id === id ? { ...m, outcome: value } : m))); }
    catch (e) { toast(errMsg(e)); }
  };

  const logout = () => { clearToken(); router.push("/login"); };
  const d = me?.device;
  const tab = (on: boolean) => `rounded-md px-4 py-1.5 text-sm font-medium ${on ? "bg-brand text-white dark:text-[#0b0e1e]" : "text-ink-muted hover:bg-subtle"}`;

  if (!ready) return <div className="flex h-screen items-center justify-center bg-surface text-sm text-ink-muted">Loading…{node}</div>;

  return (
    <div className="flex h-[100dvh] flex-col bg-surface">
      <header className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open chats" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line md:hidden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <Logo size={28} href="/chat" />
        </div>
        <div className="flex items-center gap-3 text-sm">
          {me && <span className="hidden text-ink-muted lg:inline">{me.name}{d ? ` · ${d.brand} ${d.model} · ${d.os_name} ${d.os_version}` : ""}</span>}
          <ThemeToggle />
          <button onClick={logout} className="rounded-lg border border-line px-3 py-1.5 font-medium hover:bg-subtle">Logout</button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <ChatSidebar chats={chats} currentId={chatId} open={sidebarOpen} onClose={() => setSidebarOpen(false)}
          onSelect={openChat} onNew={newChat} onDelete={deleteChat} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex justify-center border-b border-line px-4 py-2">
            <div className="inline-flex gap-1 rounded-lg border border-line p-0.5">
              <button className={tab(view === "chat")} onClick={() => setView("chat")}>Chat</button>
              <button className={tab(view === "timeline")} onClick={() => setView("timeline")}>Timeline</button>
            </div>
          </div>
          {view === "chat"
            ? <ChatPanel me={me} messages={messages} previews={previews} live={live} loading={loading}
                onSend={send} onEdit={editMessage} onDelete={deleteMessage} onOutcome={setOutcome} notify={toast} />
            : <TimelineView messages={messages} facts={facts} queries={queries} />}
        </div>

        <MemoryPanel device={d ?? null} changes={changes} facts={facts} recalled={recalled} open={panelOpen} onClose={() => setPanelOpen(false)} />
      </div>

      <button onClick={() => setPanelOpen(true)} aria-label="Open memory panel"
        className="fixed bottom-24 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-xl shadow-card lg:hidden">🧠</button>
      {node}
    </div>
  );
}
