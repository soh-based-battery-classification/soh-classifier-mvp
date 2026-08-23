import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'soh.db'}")
MODEL_DIR = os.getenv("MODEL_DIR", str(BASE_DIR / "app" / "ml" / "weights"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

CLOVA_STUDIO_API_KEY = os.getenv("CLOVA_STUDIO_API_KEY", "")
CLOVA_STUDIO_MODEL = os.getenv("CLOVA_STUDIO_MODEL", "HCX-003")
