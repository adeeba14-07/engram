from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from db import Base, engine, get_db
from models import User, Device
from schemas import (
    SignupRequest, LoginRequest, AuthResponse,
    OnboardingRequest, ChatRequest, ChatResponse,
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/auth/signup", response_model=AuthResponse)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(
        id=new_user_id(),
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
    )
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
def onboarding(body: OnboardingRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(Device).filter(Device.user_id == user.id).first()
    if existing:
        existing.brand = body.brand
        existing.model = body.model
        existing.os = body.os
        existing.age_months = body.age_months
    else:
        db.add(Device(user_id=user.id, brand=body.brand, model=body.model, os=body.os, age_months=body.age_months))
    db.commit()
    try:
        agent.write_device_facts(user.id, user.name, body.brand, body.model, body.os, body.age_months)
    except Exception as e:
        raise HTTPException(500, f"Memory write failed: {e}")
    return {"ok": True}


@app.post("/api/chat", response_model=ChatResponse)
def chat(body: ChatRequest, user: User = Depends(get_current_user)):
    try:
        return agent.handle_chat(user.id, user.name, body.message, body.day_offset)
    except Exception as e:
        raise HTTPException(500, f"Chat failed: {e}")


@app.get("/api/memory")
def memory(user: User = Depends(get_current_user)):
    return agent.get_timeline(user.id)


@app.get("/api/me")
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.user_id == user.id).first()
    return {
        "name": user.name,
        "email": user.email,
        "device": {
            "brand": device.brand, "model": device.model,
            "os": device.os, "age_months": device.age_months,
        } if device else None,
    }


@app.get("/")
def root():
    return {"service": "Engram", "status": "ok"}