from pydantic import BaseModel, EmailStr
from typing import Optional, List


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    token: str
    user_id: str


class OnboardingRequest(BaseModel):
    brand: str
    model: str
    os_name: str
    os_version: str
    age_months: int
    ram_gb: Optional[int] = None
    storage_gb: Optional[int] = None
    gpu: Optional[str] = None
    cpu: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    chat_id: Optional[str] = None
    media_base64: Optional[str] = None
    media_type: Optional[str] = None
    memory_enabled: Optional[bool] = None


class MemoryItem(BaseModel):
    id: int
    text: str
    when: Optional[str] = None
    used: bool = False
    used_in_prompt: Optional[bool] = None
    score: Optional[float] = None


class RecallExplanation(BaseModel):
    query: str
    total_in_bank: int
    unique_facts: Optional[int] = None
    merged_duplicates: Optional[int] = None
    strong_matches: Optional[int] = None
    weak_matches: Optional[int] = None          # ← NEW
    matched: List[MemoryItem]
    dropped: int


class ChatResponse(BaseModel):
    reply: str
    memories: List[MemoryItem]
    influence: str
    retained: bool
    chat_id: str
    recall: RecallExplanation


class NewChatRequest(BaseModel):
    title: Optional[str] = None


class ChatOut(BaseModel):
    id: str
    title: str
    created_at: str
    memory_enabled: bool


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    media_path: Optional[str] = None
    media_type: Optional[str] = None
    used_memories: Optional[str] = None
    recall_explanation: Optional[str] = None
    outcome: Optional[str] = None
    created_at: str


class EditMessageRequest(BaseModel):
    content: str


class OutcomeRequest(BaseModel):
    value: str