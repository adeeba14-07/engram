from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from config import DATABASE_URL

# SQLAlchemy needs to know which driver to use.
# We install 'psycopg[binary]' (psycopg 3) — so the URL scheme must be
# 'postgresql+psycopg://' instead of plain 'postgresql://'.
_url = DATABASE_URL
if _url.startswith("postgresql://"):
    _url = _url.replace("postgresql://", "postgresql+psycopg://", 1)
elif _url.startswith("postgres://"):
    _url = _url.replace("postgres://", "postgresql+psycopg://", 1)

engine = create_engine(_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()