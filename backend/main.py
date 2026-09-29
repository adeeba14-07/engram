import json
from uuid import uuid4
from datetime import datetime, timezone

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from db import Base, engine, get_db
from models import User, Device, DeviceChange, Chat, Message, Outcome
from schemas import (
    SignupRequest, LoginRequest, AuthResponse,
    OnboardingRequest, ChatRequest, ChatResponse,
    NewChatRequest, ChatOut, MessageOut,
    EditMessageRequest, OutcomeRequest,
)
from auth import (
    hash_password, verify_password, create_token, new_user_id, get_current_user,
)
import agent

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Engram API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


def _device_dict(user_id, db):
    d = db.query(Device).filter(Device.user_id == user_id).first()
    if not d:
        return None
    return {
        "brand": d.brand, "model": d.model,
        "os_name": d.os_name, "os_version": d.os_version,
        "os_updated_at": d.os_updated_at.isoformat() if d.os_updated_at else None,
        "age_months": d.age_months,
        "ram_gb": d.ram_gb, "storage_gb": d.storage_gb,
        "gpu": d.gpu, "cpu": d.cpu,
    }


def _default_chat(user_id, db):
    chat = db.query(Chat).filter(Chat.user_id == user_id,
                                 Chat.archived == False)\
        .order_by(Chat.created_at.desc()).first()
    if chat:
        return chat
    chat = Chat(id=str(uuid4()), user_id=user_id, title="New chat",
                memory_enabled=True)
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat


def _recent_outcomes(user_id, db, limit=5):
    rows = db.query(Outcome).filter(Outcome.user_id == user_id)\
        .order_by(Outcome.created_at.desc()).limit(limit).all()
    out = []
    for o in rows:
        m = db.query(Message).filter(Message.id == o.message_id).first()
        snippet = (m.content[:80] + "…") if m and m.content else "(reply)"
        label = {"worked": "✅ worked",
                 "failed": "❌ didn't work",
                 "unsure": "🤷 unsure"}.get(o.value, o.value)
        out.append(f"- {snippet} → {label}")
    return out


@app.post("/api/auth/signup", response_model=AuthResponse)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(id=new_user_id(), email=body.email,
                password_hash=hash_password(body.password), name=body.name)
    db.add(user)
    db.commit()
    return {"token": create_token(user.id), "user_id": user.id}


@app.post("/api/auth/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    return {"token": create_token(user.id), "user_id": user.id}


@app.post("/api/onboarding")
def onboarding(body: OnboardingRequest,
               user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    existing = db.query(Device).filter(Device.user_id == user.id).first()

    if existing:
        if existing.os_version != body.os_version or existing.os_name != body.os_name:
            db.add(DeviceChange(
                id=str(uuid4()), user_id=user.id, field="os_version",
                old_value=f"{existing.os_name} {existing.os_version}",
                new_value=f"{body.os_name} {body.os_version}",
            ))
            existing.os_updated_at = datetime.now(timezone.utc)

        for f in ["brand", "model", "age_months",
                  "ram_gb", "storage_gb", "gpu", "cpu"]:
            setattr(existing, f, getattr(body, f))
        existing.os_name = body.os_name
        existing.os_version = body.os_version
    else:
        db.add(Device(
            user_id=user.id, brand=body.brand, model=body.model,
            os_name=body.os_name, os_version=body.os_version,
            age_months=body.age_months,
            ram_gb=body.ram_gb, storage_gb=body.storage_gb,
            gpu=body.gpu, cpu=body.cpu,
        ))
    db.commit()
    try:
        agent.write_device_facts(user.id, user.name, body.dict())
    except Exception as e:
        raise HTTPException(500, f"Memory write failed: {e}")
    return {"ok": True}


@app.get("/api/device/changes")
def device_changes(user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    rows = db.query(DeviceChange).filter(DeviceChange.user_id == user.id)\
        .order_by(DeviceChange.changed_at.desc()).all()
    return [{
        "field": r.field, "old_value": r.old_value, "new_value": r.new_value,
        "changed_at": r.changed_at.isoformat(),
    } for r in rows]


@app.post("/api/chat", response_model=ChatResponse)
def chat(body: ChatRequest, user: User = Depends(get_current_user),
         db: Session = Depends(get_db)):
    if body.chat_id:
        chat_obj = db.query(Chat).filter(Chat.id == body.chat_id,
                                         Chat.user_id == user.id).first()
        if not chat_obj:
            raise HTTPException(404, "Chat not found")
    else:
        chat_obj = _default_chat(user.id, db)

    if body.memory_enabled is not None:
        chat_obj.memory_enabled = body.memory_enabled
        db.commit()

    if chat_obj.title in ("New chat", "Chat") or not chat_obj.title:
        chat_obj.title = (body.message or "New chat")[:60]
        db.commit()

    media_path = None
    if body.media_base64:
        media_path = f"{body.media_type or 'file'}-attached"

    user_msg = Message(
        id=str(uuid4()), chat_id=chat_obj.id, user_id=user.id,
        role="user", content=body.message,
        media_path=media_path, media_type=body.media_type,
    )
    db.add(user_msg)
    db.commit()

    device = _device_dict(user.id, db)
    outcomes = _recent_outcomes(user.id, db)
    memory_on = bool(chat_obj.memory_enabled)

    try:
        result = agent.handle_chat(
            user.id, user.name, device, body.message,
            media_base64=body.media_base64,
            media_type=body.media_type,
            prior_outcomes=outcomes,
            memory_enabled=memory_on,
        )
    except Exception as e:
        raise HTTPException(500, f"Chat failed: {e}")

    used = [m for m in result["memories"] if m.get("used_in_prompt")]
    asst_msg = Message(
        id=str(uuid4()), chat_id=chat_obj.id, user_id=user.id,
        role="assistant", content=result["reply"],
        used_memories=json.dumps(used),
        recall_explanation=json.dumps(result["recall"]),
    )
    db.add(asst_msg)
    db.commit()

    return {
        "reply": result["reply"],
        "memories": result["memories"],
        "influence": result["influence"],
        "retained": result["retained"],
        "chat_id": chat_obj.id,
        "recall": result["recall"],
    }


@app.get("/api/chats", response_model=list[ChatOut])
def list_chats(user: User = Depends(get_current_user),
               db: Session = Depends(get_db)):
    rows = db.query(Chat).filter(Chat.user_id == user.id,
                                 Chat.archived == False)\
        .order_by(Chat.created_at.desc()).all()
    return [{"id": c.id, "title": c.title,
             "created_at": c.created_at.isoformat(),
             "memory_enabled": bool(c.memory_enabled)} for c in rows]


@app.post("/api/chats", response_model=ChatOut)
def new_chat(body: NewChatRequest,
             user: User = Depends(get_current_user),
             db: Session = Depends(get_db)):
    count = db.query(Chat).filter(Chat.user_id == user.id).count()
    c = Chat(id=str(uuid4()), user_id=user.id,
             title=body.title or f"Chat {count + 1}",
             memory_enabled=True)
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"id": c.id, "title": c.title,
            "created_at": c.created_at.isoformat(),
            "memory_enabled": bool(c.memory_enabled)}


@app.delete("/api/chats/{chat_id}")
def delete_chat(chat_id: str, user: User = Depends(get_current_user),
                db: Session = Depends(get_db)):
    c = db.query(Chat).filter(Chat.id == chat_id,
                              Chat.user_id == user.id).first()
    if not c:
        raise HTTPException(404, "Chat not found")
    msgs = db.query(Message).filter(Message.chat_id == chat_id).all()
    for m in msgs:
        db.query(Outcome).filter(Outcome.message_id == m.id).delete()
        db.delete(m)
    db.delete(c)
    db.commit()
    return {"ok": True}


@app.get("/api/chats/{chat_id}/messages", response_model=list[MessageOut])
def chat_messages(chat_id: str, user: User = Depends(get_current_user),
                  db: Session = Depends(get_db)):
    msgs = db.query(Message).filter(
        Message.chat_id == chat_id,
        Message.user_id == user.id,
        Message.deleted == False,
    ).order_by(Message.created_at.asc()).all()

    ids = [m.id for m in msgs]
    outcomes = {}
    if ids:
        rows = db.query(Outcome).filter(Outcome.message_id.in_(ids)).all()
        for o in rows:
            outcomes[o.message_id] = o.value

    return [{
        "id": m.id, "role": m.role, "content": m.content,
        "media_path": m.media_path, "media_type": m.media_type,
        "used_memories": m.used_memories,
        "recall_explanation": m.recall_explanation,
        "outcome": outcomes.get(m.id),
        "created_at": m.created_at.isoformat(),
    } for m in msgs]


@app.delete("/api/messages/{message_id}")
def delete_message(message_id: str, user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    m = db.query(Message).filter(Message.id == message_id,
                                 Message.user_id == user.id).first()
    if not m:
        raise HTTPException(404, "Message not found")
    content = m.content
    m.deleted = True
    db.commit()
    try:
        agent.delete_memories_matching(agent.bank_for(user.id), content[:60])
    except Exception:
        pass
    return {"ok": True}


@app.put("/api/messages/{message_id}")
def edit_message(message_id: str, body: EditMessageRequest,
                 user: User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    m = db.query(Message).filter(Message.id == message_id,
                                 Message.user_id == user.id).first()
    if not m:
        raise HTTPException(404, "Message not found")

    old = m.content
    m.content = body.content
    m.used_memories = None
    m.recall_explanation = None
    db.commit()

    # Delete the assistant reply that followed this message
    next_msg = db.query(Message).filter(
        Message.chat_id == m.chat_id,
        Message.user_id == user.id,
        Message.role == "assistant",
        Message.created_at > m.created_at,
        Message.deleted == False,
    ).order_by(Message.created_at.asc()).first()

    if next_msg:
        next_msg.deleted = True
        db.commit()
        try:
            agent.delete_memories_matching(
                agent.bank_for(user.id), next_msg.content[:60]
            )
        except Exception:
            pass

    try:
        bank = agent.bank_for(user.id)
        agent.delete_memories_matching(bank, old[:60])
        agent.retain_content(bank, f"{user.name} said: {body.content}")
    except Exception:
        pass

    return {"ok": True, "reply_deleted": next_msg.id if next_msg else None}


@app.post("/api/messages/{message_id}/outcome")
def record_outcome(message_id: str, body: OutcomeRequest,
                   user: User = Depends(get_current_user),
                   db: Session = Depends(get_db)):
    if body.value not in ("worked", "failed", "unsure"):
        raise HTTPException(400, "value must be worked|failed|unsure")
    m = db.query(Message).filter(Message.id == message_id,
                                 Message.user_id == user.id).first()
    if not m:
        raise HTTPException(404, "Message not found")
    db.query(Outcome).filter(Outcome.message_id == message_id).delete()
    db.add(Outcome(id=str(uuid4()), message_id=message_id,
                   user_id=user.id, value=body.value))
    db.commit()
    try:
        agent.record_outcome(user.id, m.content, body.value)
    except Exception:
        pass
    return {"ok": True}


@app.get("/api/memory")
def memory(user: User = Depends(get_current_user)):
    return {"facts": agent.get_all_facts(user.id)}


@app.get("/api/me")
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {
        "name": user.name,
        "email": user.email,
        "device": _device_dict(user.id, db),
    }


@app.get("/")
def root():
    return {"service": "Engram", "status": "ok"}