import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./intellidesk.db")
CHROMA_PATH = os.getenv("CHROMA_PATH", "./data/chroma_db")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./data/uploads")

os.makedirs(CHROMA_PATH, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)