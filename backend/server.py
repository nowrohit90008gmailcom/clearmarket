from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import uvicorn
import yfinance as yf
import json


# ================== ENV SETUP ==================

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "clearmarket")
JWT_SECRET = os.environ["JWT_SECRET"]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
ALPHA_VANTAGE_KEY = os.environ.get("ALPHA_VANTAGE_KEY", "demo")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
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

# ================== STOCK HELPERS ==================

STOCK_UNIVERSE = [
    {"symbol": "RELIANCE", "name": "Reliance Industries", "exchange": "NSE", "yf": "RELIANCE.NS"},
    {"symbol": "TCS", "name": "Tata Consultancy Services", "exchange": "NSE", "yf": "TCS.NS"},
    {"symbol": "HDFCBANK", "name": "HDFC Bank", "exchange": "NSE", "yf": "HDFCBANK.NS"},
    {"symbol": "INFY", "name": "Infosys", "exchange": "NSE", "yf": "INFY.NS"},
    {"symbol": "ICICIBANK", "name": "ICICI Bank", "exchange": "NSE", "yf": "ICICIBANK.NS"},
    {"symbol": "SBIN", "name": "State Bank of India", "exchange": "NSE", "yf": "SBIN.NS"},
    {"symbol": "LT", "name": "Larsen & Toubro", "exchange": "NSE", "yf": "LT.NS"},
    {"symbol": "ITC", "name": "ITC", "exchange": "NSE", "yf": "ITC.NS"},
]

def resolve_symbol(symbol: str) -> Dict[str, str]:
    base = symbol.strip().upper()
    for stock in STOCK_UNIVERSE:
        if stock["symbol"] == base:
            return stock
    yf_symbol = base if "." in base else f"{base}.NS"
    return {"symbol": base, "name": base, "exchange": "NSE", "yf": yf_symbol}

def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default

def format_market_cap(value: float) -> str:
    if value >= 1e12:
        return f"₹{value / 1e12:.2f}T"
    if value >= 1e9:
        return f"₹{value / 1e9:.2f}B"
    if value >= 1e7:
        return f"₹{value / 1e7:.2f}Cr"
    return f"₹{value:,.0f}"

def build_price_history(hist) -> List[Dict[str, Any]]:
    history = []
    for idx, row in hist.tail(30).iterrows():
        history.append({
            "date": idx.strftime("%Y-%m-%d"),
            "price": round(safe_float(row.get("Close")), 2),
        })
    return history

def heuristic_analysis(change_percent: float, pe_ratio: float, roe: float) -> Dict[str, Any]:
    score = 0
    if change_percent > 1:
        score += 1
    if 5 <= pe_ratio <= 35:
        score += 1
    if roe >= 12:
        score += 1

    if score >= 3:
        verdict = "BUY"
    elif score == 2:
        verdict = "HOLD"
    else:
        verdict = "SELL"

    confidence = min(92, 55 + score * 12)
    reasoning = [
        f"Price momentum is {change_percent:.2f}% today.",
        f"P/E ratio is {pe_ratio:.2f}, indicating valuation context.",
        f"ROE stands at {roe:.2f}% for profitability signal.",
    ]
    risks = [
        "Market volatility can invalidate short-term momentum.",
        "Macro-economic events may impact sector performance.",
        "Always validate with your own risk profile and horizon.",
    ]
    return {"verdict": verdict, "confidence": confidence, "reasoning": reasoning, "risks": risks}

async def gemini_stock_analysis(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not GEMINI_API_KEY:
        return None

    prompt = f"""
You are a conservative equity research assistant for Indian retail investors.
Analyze the stock snapshot and return strict JSON with keys: verdict, confidence, reasoning, risks.
- verdict must be one of BUY, HOLD, SELL
- confidence must be integer 1-100
- reasoning must be array of exactly 3 short bullets
- risks must be array of exactly 3 short bullets
Stock data:
{json.dumps(payload, indent=2)}
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"},
    }

    async with httpx.AsyncClient(timeout=25) as client_http:
        resp = await client_http.post(url, json=body)

    if resp.status_code >= 400:
        logger.warning("Gemini request failed: %s %s", resp.status_code, resp.text)
        return None

    data = resp.json()
    text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
    if not text:
        return None

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return None

    verdict = str(parsed.get("verdict", "HOLD")).upper()
    if verdict not in {"BUY", "HOLD", "SELL"}:
        verdict = "HOLD"

    return {
        "verdict": verdict,
        "confidence": int(parsed.get("confidence", 65)),
        "reasoning": list(parsed.get("reasoning", []))[:3],
        "risks": list(parsed.get("risks", []))[:3],
    }

# ================== ROUTES ==================

@api_router.get("/stocks/search")
async def search_stocks(q: str = ""):
    query = q.strip().upper()
    if not query:
        return []
    matches = [
        s for s in STOCK_UNIVERSE
        if query in s["symbol"] or query in s["name"].upper()
    ]
    return [{"symbol": m["symbol"], "name": m["name"], "exchange": m["exchange"]} for m in matches[:10]]

@api_router.get("/stocks/realtime/{symbol}")
async def realtime_stock(symbol: str):
    stock_meta = resolve_symbol(symbol)
    ticker = yf.Ticker(stock_meta["yf"])
    info = ticker.info or {}
    hist = ticker.history(period="2d", interval="1d")

    if hist.empty:
        raise HTTPException(status_code=404, detail="Stock data not found")

    closes = hist["Close"].dropna().tolist()
    current = safe_float(closes[-1])
    previous = safe_float(closes[-2], current) if len(closes) > 1 else current
    change_percent = ((current - previous) / previous * 100) if previous else 0

    return {
        "symbol": stock_meta["symbol"],
        "name": info.get("shortName") or stock_meta["name"],
        "exchange": stock_meta["exchange"],
        "current_price": round(current, 2),
        "change_percent": round(change_percent, 2),
        "currency": info.get("currency", "INR"),
        "market_state": info.get("marketState", "REGULAR"),
        "source": "Yahoo Finance",
    }

@api_router.get("/stocks/analyze/{symbol}")
async def analyze_stock(symbol: str):
    stock_meta = resolve_symbol(symbol)
    ticker = yf.Ticker(stock_meta["yf"])
    info = ticker.info or {}
    hist = ticker.history(period="3mo", interval="1d")

    if hist.empty:
        raise HTTPException(status_code=404, detail="Unable to fetch stock history from Yahoo Finance")

    closes = hist["Close"].dropna().tolist()
    current_price = safe_float(closes[-1])
    previous = safe_float(closes[-2], current_price) if len(closes) > 1 else current_price
    change_percent = ((current_price - previous) / previous * 100) if previous else 0

    pe_ratio = safe_float(info.get("trailingPE"), 0)
    roe = safe_float(info.get("returnOnEquity"), 0) * 100
    market_cap = safe_float(info.get("marketCap"), 0)

    input_payload = {
        "symbol": stock_meta["symbol"],
        "name": info.get("shortName") or stock_meta["name"],
        "current_price": round(current_price, 2),
        "change_percent": round(change_percent, 2),
        "pe_ratio": pe_ratio,
        "roe": round(roe, 2),
        "market_cap": market_cap,
        "sector": info.get("sector", "Unknown"),
        "source": "Yahoo Finance realtime + fundamentals",
    }

    ai = await gemini_stock_analysis(input_payload)
    if ai is None:
        ai = heuristic_analysis(change_percent, pe_ratio, roe)

    fundamentals = {
        "pe_ratio": round(pe_ratio, 2),
        "market_cap_display": format_market_cap(market_cap),
        "eps": round(safe_float(info.get("trailingEps"), 0), 2),
        "dividend_yield": round(safe_float(info.get("dividendYield"), 0) * 100, 2),
        "debt_to_equity": round(safe_float(info.get("debtToEquity"), 0), 2),
        "roe": round(roe, 2),
        "52_week_high": round(safe_float(info.get("fiftyTwoWeekHigh"), current_price), 2),
        "52_week_low": round(safe_float(info.get("fiftyTwoWeekLow"), current_price), 2),
        "sector": info.get("sector", "Unknown"),
        "book_value": round(safe_float(info.get("bookValue"), 0), 2),
    }

    analysis_result = {
        "symbol": stock_meta["symbol"],
        "name": info.get("shortName") or stock_meta["name"],
        "exchange": stock_meta["exchange"],
        "current_price": round(current_price, 2),
        "change_percent": round(change_percent, 2),
        "price_history": build_price_history(hist),
        "verdict": ai["verdict"],
        "confidence": int(ai["confidence"]),
        "reasoning": ai["reasoning"],
        "risks": ai["risks"],
        "fundamentals": fundamentals,
        "disclaimer": "AI-generated analysis for educational purposes only, not financial advice.",
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "analysis_engine": f"{GEMINI_MODEL} via Gemini API" if GEMINI_API_KEY else "Heuristic fallback",
        "data_source": "Yahoo Finance",
    }

    await db.stock_analyses.insert_one(analysis_result)
    return analysis_result

@api_router.get("/stocks/recent")
async def recent_stock_analyses():
    docs = await db.stock_analyses.find({}, {"_id": 0}).sort("analyzed_at", -1).to_list(12)
    return docs


@app.get("/health")
async def root_health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@api_router.get("/config/health")
async def config_health():
    return {
        "status": "ok",
        "time": datetime.now(timezone.utc).isoformat(),
        "config": {
            "gemini_configured": bool(GEMINI_API_KEY),
            "gemini_model": GEMINI_MODEL,
            "mongo_configured": bool(MONGO_URI),
            "jwt_configured": bool(JWT_SECRET),
        },
    }

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
