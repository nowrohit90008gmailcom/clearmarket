from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
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
JWT_SECRET = os.environ.get("JWT_SECRET", "changeme")

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
ALPHA_VANTAGE_KEY = os.environ.get("ALPHA_VANTAGE_KEY", "demo")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
ADMIN_EMAILS = {email.strip().lower() for email in os.environ.get("ADMIN_EMAILS", "").split(",") if email.strip()}

client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]

app = FastAPI(title="ClearAI API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("clearai")


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PortfolioStockAdd(BaseModel):
    symbol: str
    quantity: float
    buy_price: float


class BlogPayload(BaseModel):
    title: str
    content: str
    excerpt: str
    cover_image: Optional[str] = ""
    tags: List[str] = []
    published: bool = False


class PageVisit(BaseModel):
    page: str
    referrer: Optional[str] = None


PLANS = {
    "free": {"name": "Free", "price": 0, "analyses_limit": 5, "features": ["5 analyses/month", "Basic fundamentals", "Email support"]},
    "basic": {"name": "Basic", "price": 599, "analyses_limit": 30, "features": ["30 analyses/month", "Full fundamentals", "PDF reports", "Priority support"]},
    "pro": {"name": "Pro", "price": 1299, "analyses_limit": 100, "features": ["100 analyses/month", "Portfolio insights", "Priority support"]},
    "premium": {"name": "Premium", "price": 1999, "analyses_limit": 500, "features": ["500 analyses/month", "Mutual fund analysis", "24/7 support"]},
}

MOCK_MUTUAL_FUNDS = [
    {"id": "mf1", "name": "HDFC Flexi Cap Fund", "category": "Equity - Flexi Cap", "risk": "High", "returns_1y": 18.5, "returns_3y": 15.2, "nav": 1245.67, "aum": 45000, "expense_ratio": 1.8},
    {"id": "mf2", "name": "SBI Blue Chip Fund", "category": "Equity - Large Cap", "risk": "Moderate", "returns_1y": 14.2, "returns_3y": 12.8, "nav": 67.89, "aum": 38000, "expense_ratio": 1.5},
    {"id": "mf3", "name": "ICICI Pru Balanced Advantage", "category": "Hybrid - Balanced", "risk": "Low", "returns_1y": 11.5, "returns_3y": 10.2, "nav": 52.34, "aum": 52000, "expense_ratio": 1.2},
    {"id": "mf4", "name": "Axis Small Cap Fund", "category": "Equity - Small Cap", "risk": "Very High", "returns_1y": 25.8, "returns_3y": 22.5, "nav": 89.45, "aum": 15000, "expense_ratio": 2.0},
]

STOCK_UNIVERSE = [
    {"symbol": "RELIANCE", "name": "Reliance Industries", "exchange": "NSE", "yf": "RELIANCE.NS"},
    {"symbol": "TCS", "name": "Tata Consultancy Services", "exchange": "NSE", "yf": "TCS.NS"},
    {"symbol": "HDFCBANK", "name": "HDFC Bank", "exchange": "NSE", "yf": "HDFCBANK.NS"},
    {"symbol": "INFY", "name": "Infosys", "exchange": "NSE", "yf": "INFY.NS"},
    {"symbol": "ICICIBANK", "name": "ICICI Bank", "exchange": "NSE", "yf": "ICICIBANK.NS"},
    {"symbol": "SBIN", "name": "State Bank of India", "exchange": "NSE", "yf": "SBIN.NS"},
]


def generate_user_id() -> str:
    return f"user_{uuid.uuid4().hex[:12]}"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: str) -> str:
    payload = {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)}
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


async def gemini_stock_analysis(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not GEMINI_API_KEY:
        return None

    prompt = f"""
You are a conservative equity research assistant for Indian retail investors.
Analyze this stock snapshot and return strict JSON with keys: verdict, confidence, reasoning, risks.
- verdict: BUY|HOLD|SELL
- confidence: integer 1-100
- reasoning: array of exactly 3 short bullets
- risks: array of exactly 3 short bullets
Data:\n{json.dumps(payload, indent=2)}
"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"},
    }

    try:
        async with httpx.AsyncClient(timeout=25) as client_http:
            response = await client_http.post(url, json=body)
            response.raise_for_status()
            data = response.json()

        text = data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
        parsed = json.loads(text)
        verdict = str(parsed.get("verdict", "HOLD")).upper()
        if verdict not in {"BUY", "HOLD", "SELL"}:
            verdict = "HOLD"

        return {
            "verdict": verdict,
            "confidence": int(parsed.get("confidence", 65)),
            "reasoning": list(parsed.get("reasoning", []))[:3],
            "risks": list(parsed.get("risks", []))[:3],
        }
    except Exception as exc:
        logger.warning("Gemini request failed: %s", exc)
        return None


@api_router.post("/track/visit")
async def track_visit(payload: PageVisit, request: Request):
    await db.page_visits.insert_one({
        "id": f"visit_{uuid.uuid4().hex[:12]}",
        "page": payload.page,
        "referrer": payload.referrer,
        "user_agent": request.headers.get("user-agent"),
        "visited_at": datetime.now(timezone.utc),
    })
    return {"status": "ok"}



@api_router.get("/config/health")
async def config_health():
    return {
        "status": "ok",
        "time": datetime.now(timezone.utc).isoformat(),
        "config": {
            "gemini": {
                "configured": bool(GEMINI_API_KEY),
                "model": GEMINI_MODEL,
            },
            "database": {
                "name": DB_NAME,
            },
        },
    }

@api_router.post("/auth/signup")
async def signup(user: UserCreate):
    if await db.users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already exists")

    user_id = generate_user_id()
    role = "admin" if user.email.lower() in ADMIN_EMAILS else "user"
    doc = {
        "user_id": user_id,
        "email": user.email,
        "name": user.name,
        "password_hash": hash_password(user.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "analyses_used": 0,
        "plan": "free",
        "role": role,
    }
    await db.users.insert_one(doc)

    return {"token": create_token(user_id), "user": build_user_response(doc)}


@api_router.post("/auth/login")
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    public_user = {k: v for k, v in db_user.items() if k not in {"_id", "password_hash"}}
    return {"token": create_token(db_user["user_id"]), "user": build_user_response(public_user)}


@api_router.get("/auth/me")
async def auth_me(user=Depends(get_current_user)):
    return build_user_response(user)


@api_router.get("/stocks/search")
async def search_stocks(q: str = ""):
    query = q.strip().upper()
    if not query:
        return []
    matches = [s for s in STOCK_UNIVERSE if query in s["symbol"] or query in s["name"].upper()]
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
async def analyze_stock(symbol: str, user=Depends(get_current_user)):
    stock_meta = resolve_symbol(symbol)
    ticker = yf.Ticker(stock_meta["yf"])
    info = ticker.info or {}
    hist = ticker.history(period="3mo", interval="1d")
    if hist.empty:
        raise HTTPException(status_code=404, detail="Unable to fetch stock history")

    closes = hist["Close"].dropna().tolist()
    current_price = safe_float(closes[-1])
    previous = safe_float(closes[-2], current_price) if len(closes) > 1 else current_price
    change_percent = ((current_price - previous) / previous * 100) if previous else 0
    pe_ratio = safe_float(info.get("trailingPE"), 0)
    roe = safe_float(info.get("returnOnEquity"), 0) * 100

    payload = {
        "symbol": stock_meta["symbol"],
        "name": info.get("shortName") or stock_meta["name"],
        "current_price": round(current_price, 2),
        "change_percent": round(change_percent, 2),
        "pe_ratio": pe_ratio,
        "roe": round(roe, 2),
        "sector": info.get("sector", "Unknown"),
        "source": "Yahoo Finance",
    }

    ai = await gemini_stock_analysis(payload) or heuristic_analysis(change_percent, pe_ratio, roe)
    analysis_result = {
        **payload,
        "exchange": stock_meta["exchange"],
        "price_history": build_price_history(hist),
        "verdict": ai["verdict"],
        "confidence": int(ai["confidence"]),
        "reasoning": ai["reasoning"],
        "risks": ai["risks"],
        "fundamentals": {
            "pe_ratio": round(pe_ratio, 2),
            "roe": round(roe, 2),
            "market_cap": safe_float(info.get("marketCap"), 0),
            "dividend_yield": round(safe_float(info.get("dividendYield"), 0) * 100, 2),
            "52_week_high": round(safe_float(info.get("fiftyTwoWeekHigh"), current_price), 2),
            "52_week_low": round(safe_float(info.get("fiftyTwoWeekLow"), current_price), 2),
        },
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "analysis_engine": f"{GEMINI_MODEL} via Gemini API" if GEMINI_API_KEY else "Heuristic fallback",
        "data_source": "Yahoo Finance",
    }

    await db.stock_analyses.insert_one({**analysis_result, "user_id": user["user_id"]})
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"analyses_used": 1}})
    await db.analysis_logs.insert_one({"id": f"an_{uuid.uuid4().hex[:12]}", "user_id": user["user_id"], "symbol": stock_meta["symbol"], "time": datetime.now(timezone.utc)})

    return analysis_result


@api_router.get("/stocks/recent")
async def recent_stock_analyses():
    docs = await db.stock_analyses.find({}, {"_id": 0, "user_id": 0}).sort("analyzed_at", -1).to_list(12)
    return docs


@api_router.get("/portfolio")
async def get_portfolio(user=Depends(get_current_user)):
    stocks = await db.portfolio_stocks.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(500)

    enriched = []
    total_invested = 0.0
    total_current = 0.0
    for item in stocks:
        live = await realtime_stock(item["symbol"])
        quantity = safe_float(item.get("quantity"), 0)
        buy_price = safe_float(item.get("buy_price"), 0)
        current_price = safe_float(live.get("current_price"), buy_price)
        invested = quantity * buy_price
        current_value = quantity * current_price
        pnl = current_value - invested
        pnl_pct = ((pnl / invested) * 100) if invested else 0

        total_invested += invested
        total_current += current_value
        enriched.append({
            **item,
            "name": live.get("name", item["symbol"]),
            "current_price": round(current_price, 2),
            "day_change": live.get("change_percent", 0),
            "profit_loss": round(pnl, 2),
            "profit_loss_percent": round(pnl_pct, 2),
        })

    return {
        "stocks": enriched,
        "summary": {
            "total_invested": round(total_invested, 2),
            "total_current_value": round(total_current, 2),
            "total_profit_loss": round(total_current - total_invested, 2),
            "total_profit_loss_percent": round(((total_current - total_invested) / total_invested) * 100, 2) if total_invested else 0,
            "stock_count": len(enriched),
        },
    }


@api_router.post("/portfolio/add")
async def add_to_portfolio(stock: PortfolioStockAdd, user=Depends(get_current_user)):
    stock_id = f"ps_{uuid.uuid4().hex[:12]}"
    await db.portfolio_stocks.insert_one({
        "id": stock_id,
        "user_id": user["user_id"],
        "symbol": stock.symbol.upper(),
        "quantity": stock.quantity,
        "buy_price": stock.buy_price,
        "added_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"id": stock_id, "message": "Stock added to portfolio"}


@api_router.delete("/portfolio/{stock_id}")
async def remove_from_portfolio(stock_id: str, user=Depends(get_current_user)):
    result = await db.portfolio_stocks.delete_one({"id": stock_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Stock not found in portfolio")
    return {"message": "Stock removed from portfolio"}


@api_router.get("/plans")
async def get_plans():
    return [{"id": plan_id, **plan_data} for plan_id, plan_data in PLANS.items()]


@api_router.get("/mutualfunds")
async def get_mutual_funds(category: Optional[str] = None):
    if not category:
        return MOCK_MUTUAL_FUNDS
    return [fund for fund in MOCK_MUTUAL_FUNDS if category.lower() in fund["category"].lower()]


@api_router.get("/mutualfunds/{fund_id}")
async def get_mutual_fund_detail(fund_id: str, user=Depends(get_current_user)):
    fund = next((f for f in MOCK_MUTUAL_FUNDS if f["id"] == fund_id), None)
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")

    risk_map = {
        "Low": "Suitable for conservative investors seeking stable returns",
        "Moderate": "Suitable for balanced investors with medium-term goals",
        "High": "Suitable for aggressive investors with long-term horizon",
        "Very High": "Suitable only for experienced investors with high risk appetite",
    }
    return {**fund, "suitability": risk_map.get(fund["risk"], "Consult advisor"), "recommendation": "CONSIDER" if fund["returns_3y"] > 10 else "REVIEW"}


@api_router.get("/blogs")
async def get_blogs():
    docs = await db.blogs.find({"published": True}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return docs


@api_router.get("/blogs/{blog_id}")
async def get_blog_detail(blog_id: str):
    blog = await db.blogs.find_one({"id": blog_id, "published": True}, {"_id": 0})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")

    await db.blogs.update_one({"id": blog_id}, {"$inc": {"views": 1}})
    blog["views"] = blog.get("views", 0) + 1
    return blog


@api_router.get("/admin/users")
async def get_all_users(admin=Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [build_user_response(user) | {"role": user.get("role", "user")} for user in users]


@api_router.get("/admin/stats")
async def get_admin_stats(admin=Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    total_analyses = await db.analysis_logs.count_documents({})
    total_blogs = await db.blogs.count_documents({})

    plan_distribution = {}
    for plan_id in PLANS.keys():
        plan_distribution[plan_id] = await db.users.count_documents({"plan": plan_id})

    now = datetime.now(timezone.utc)
    day_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    week_start = day_start - timedelta(days=6)

    visits_today = await db.page_visits.count_documents({"visited_at": {"$gte": day_start}})
    visits_week = await db.page_visits.count_documents({"visited_at": {"$gte": week_start}})

    page_breakdown = await db.page_visits.aggregate([
        {"$match": {"visited_at": {"$gte": week_start}}},
        {"$group": {"_id": "$page", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]).to_list(20)

    daily_visits = await db.page_visits.aggregate([
        {"$match": {"visited_at": {"$gte": week_start}}},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$visited_at"}}, "visits": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]).to_list(20)

    return {
        "total_users": total_users,
        "total_analyses": total_analyses,
        "total_blogs": total_blogs,
        "plan_distribution": plan_distribution,
        "analytics": {
            "visits_today": visits_today,
            "visits_week": visits_week,
            "page_breakdown": page_breakdown,
            "daily_visits": [{"date": v["_id"], "visits": v["visits"]} for v in daily_visits],
        },
    }


@api_router.get("/admin/blogs")
async def get_admin_blogs(admin=Depends(get_admin_user)):
    return await db.blogs.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api_router.post("/admin/blogs")
async def create_blog(payload: BlogPayload, admin=Depends(get_admin_user)):
    blog_id = f"blog_{uuid.uuid4().hex[:12]}"
    doc = {
        "id": blog_id,
        "title": payload.title,
        "content": payload.content,
        "excerpt": payload.excerpt,
        "cover_image": payload.cover_image,
        "tags": payload.tags,
        "published": payload.published,
        "author_id": admin["user_id"],
        "author_name": admin.get("name", "Admin"),
        "views": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.blogs.insert_one(doc)
    return doc


@api_router.put("/admin/blogs/{blog_id}")
async def update_blog(blog_id: str, payload: BlogPayload, admin=Depends(get_admin_user)):
    update_data = {
        "title": payload.title,
        "content": payload.content,
        "excerpt": payload.excerpt,
        "cover_image": payload.cover_image,
        "tags": payload.tags,
        "published": payload.published,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.blogs.update_one({"id": blog_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Blog not found")
    return {"message": "Blog updated"}


@api_router.delete("/admin/blogs/{blog_id}")
async def delete_blog(blog_id: str, admin=Depends(get_admin_user)):
    result = await db.blogs.delete_one({"id": blog_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blog not found")
    return {"message": "Blog deleted"}


@api_router.put("/admin/user/{user_id}/role")
async def update_user_role(user_id: str, role: str, admin=Depends(get_admin_user)):
    if role not in {"user", "admin"}:
        raise HTTPException(status_code=400, detail="Invalid role")

    result = await db.users.update_one({"user_id": user_id}, {"$set": {"role": role}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Role updated"}


@api_router.put("/admin/user/{user_id}/plan")
async def update_user_plan(user_id: str, plan: str, admin=Depends(get_admin_user)):
    if plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan")

    result = await db.users.update_one({"user_id": user_id}, {"$set": {"plan": plan, "analyses_used": 0}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Plan updated"}


@app.get("/health")
async def root_health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@api_router.get("/config/health")
async def config_health():
    return {
        "status": "ok",
        "time": datetime.now(timezone.utc).isoformat(),
        "config": {
            "gemini": {"configured": bool(GEMINI_API_KEY), "model": GEMINI_MODEL},
            "database": {"name": DB_NAME},
        },
    }


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


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, log_level="info")
