export type Id = number | string;

export type Device = {
  brand: string;
  model: string;
  os_name: string;
  os_version: string;
  os_updated_at?: string | null;
  age_months?: number | null;
  ram_gb?: number | null;
  storage_gb?: number | null;
  gpu?: string | null;
  cpu?: string | null;
};
export type OnboardingPayload = {
  brand: string; model: string; os_name: string; os_version: string; age_months: number;
  ram_gb?: number; storage_gb?: number; gpu?: string; cpu?: string;
};
export type Me = { name: string; email?: string; device: Device | null };
export type DeviceChange = { field: string; old_value: string; new_value: string; changed_at: string };

export type Chat = { id: Id; title: string | null; created_at: string; memory_enabled?: boolean };
export type Outcome = "worked" | "failed" | "unsure";
export type ApiMessage = {
  id: Id;
  role: "user" | "assistant" | string;
  content: string;
  media_path?: string | null;
  media_type?: string | null;
  used_memories?: unknown;
  recall_explanation?: string | null;
  outcome?: Outcome | null;
  edited?: boolean;
  created_at: string;
};

export type Memory = { id: Id; text: string; when: string; used: boolean; score?: number };
export type Recall = { query: string; total_in_bank: number; matched: (Memory | string)[]; dropped: number };
export type ChatRequest = { message: string; chat_id?: Id; memory_enabled?: boolean; media_base64?: string; media_type?: "image" | "video" };
export type ChatResponse = { reply: string; memories: Memory[]; influence: string; retained: boolean; chat_id: Id; recall?: Recall };

export type Fact = { text: string; when: string };
export type MemoryResponse = { facts: Fact[] };
export type AuthResponse = { token: string; user_id: string };
