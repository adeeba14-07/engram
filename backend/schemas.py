from pydantic import BaseModel, EmailStr


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
    os: str
    age_months: int


class ChatRequest(BaseModel):
    message: str
    day_offset: int = 0


class MemoryItem(BaseModel):
    id: int
    text: str
    when: str | None = None
    type: str = "fact"
    used: bool = False


class ChatResponse(BaseModel):
    reply: str
    memories: list[MemoryItem]
    influence: str
    retained: bool