import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
HINDSIGHT_API_KEY = os.getenv("HINDSIGHT_API_KEY")
HINDSIGHT_BASE_URL = os.getenv("HINDSIGHT_BASE_URL")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24 * 7

missing = [k for k in ["DATABASE_URL", "HINDSIGHT_API_KEY", "HINDSIGHT_BASE_URL", "GROQ_API_KEY"] if not os.getenv(k)]
if missing:
    raise RuntimeError(f"Missing env vars: {', '.join(missing)}")