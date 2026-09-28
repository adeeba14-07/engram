from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
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
    os = Column(String, nullable=False)
    age_months = Column(Integer, nullable=False)