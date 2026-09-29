import type {
  ApiMessage, AuthResponse, Chat, ChatRequest, ChatResponse, Device, DeviceChange,
  Id, Me, MemoryResponse, OnboardingPayload, Outcome,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const KEY = "engram_token";

export const getToken = () => (typeof window === "undefined" ? null : localStorage.getItem(KEY));
export const setToken = (t: string) => localStorage.setItem(KEY, t);
export const clearToken = () => localStorage.removeItem(KEY);

function detailText(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail.map((d) => (d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : "")).filter(Boolean);
    if (msgs.length) return msgs.join(", ");
  }
  return "Something went wrong";
}

async function req<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, { ...init, headers });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  if (!res.ok) {
    if (res.status === 401 && auth) {
      clearToken();
      if (typeof window !== "undefined") window.location.replace("/login");
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(detailText((body as { detail?: unknown }).detail));
  }
  return res.json();
}
const send = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

export const api = {
  signup: (email: string, password: string, name: string) => req<AuthResponse>("/auth/signup", send("POST", { email, password, name }), false),
  login: (email: string, password: string) => req<AuthResponse>("/auth/login", send("POST", { email, password }), false),
  onboarding: (d: OnboardingPayload) => req<{ ok: boolean }>("/onboarding", send("POST", d)),
  me: () => req<Me>("/me"),
  deviceChanges: () => req<DeviceChange[]>("/device/changes"),
  memory: () => req<MemoryResponse>("/memory"),

  chats: () => req<Chat[]>("/chats"),
  createChat: (title?: string) => req<Chat>("/chats", send("POST", title ? { title } : {})),
  deleteChat: (id: Id) => req<{ ok: boolean }>(`/chats/${id}`, send("DELETE")),
  messages: (id: Id) => req<ApiMessage[]>(`/chats/${id}/messages`),

  chat: (body: ChatRequest) => req<ChatResponse>("/chat", send("POST", body)),
  deleteMessage: (id: Id) => req<{ ok: boolean }>(`/messages/${id}`, send("DELETE")),
  editMessage: (id: Id, content: string) => req<{ ok: boolean }>(`/messages/${id}`, send("PUT", { content })),
  setOutcome: (id: Id, value: Outcome) => req<{ ok: boolean }>(`/messages/${id}/outcome`, send("POST", { value })),
};
export type { Device };
