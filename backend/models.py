from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from db import Base


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Device(Base):
    __tablename__ = "devices"
    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    brand = Column(String, nullable=False)
    model = Column(String, nullable=False)
    os_name = Column(String, nullable=False)
    os_version = Column(String, nullable=False)
    os_updated_at = Column(DateTime(timezone=True), nullable=True)
    age_months = Column(Integer, nullable=False)
    ram_gb = Column(Integer, nullable=True)
    storage_gb = Column(Integer, nullable=True)
    gpu = Column(String, nullable=True)
    cpu = Column(String, nullable=True)


class DeviceChange(Base):
    __tablename__ = "device_changes"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    field = Column(String, nullable=False)
    old_value = Column(String, nullable=True)
    new_value = Column(String, nullable=False)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())


class Chat(Base):
    __tablename__ = "chats"
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False, default="New chat")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    archived = Column(Boolean, nullable=False, default=False)
    memory_enabled = Column(Boolean, nullable=False, default=True)


class Message(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True, index=True)
    chat_id = Column(String, ForeignKey("chats.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    media_path = Column(String, nullable=True)
    media_type = Column(String, nullable=True)
    used_memories = Column(Text, nullable=True)
    recall_explanation = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted = Column(Boolean, nullable=False, default=False)


class Outcome(Base):
    __tablename__ = "outcomes"
    id = Column(String, primary_key=True, index=True)
    message_id = Column(String, ForeignKey("messages.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    value = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())