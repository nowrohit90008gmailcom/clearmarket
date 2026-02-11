from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import uvicorn

# ================== ENV SETUP ==================

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "clearmarket")
JWT_SECRET = os.environ["JWT_SECRET"]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
ALPHA_VANTAGE_KEY = os.environ.get("ALPHA_VANTAGE_KEY", "demo")
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

# ================== DB ==================

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

# ================== APP ==================

app = FastAPI(title="ClearMarket API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clearmarket")

# ================== MODELS ==================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# ================== HELPERS ==================

def generate_user_id():
    return f"user_{uuid.uuid4().hex[:12]}"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

# ================== ROUTES ==================





@app.get("/health")
async def root_health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}

@api_router.post("/auth/signup")
async def signup(user: UserCreate):
    if await db.users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already exists")

    user_id = generate_user_id()
    await db.users.insert_one({
        "user_id": user_id,
        "email": user.email,
        "name": user.name,
        "password_hash": hash_password(user.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "analyses_used": 0,
        "plan": "free",
        "role": "user"
    })

    return {"token": create_token(user_id)}

@api_router.post("/auth/login")
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {"token": create_token(db_user["user_id"])}

# ================== APP SETUP ==================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()

# ================== SERVER START (CRITICAL) ==================

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
