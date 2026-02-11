from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import os
import logging
import uuid
import bcrypt
import jwt
import httpx
import uvicorn
import yfinance as yf
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "clearmarket")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant")
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
ADMIN_EMAILS = {
    email.strip().lower()
    for email in os.environ.get("ADMIN_EMAILS", "admin@clearai.app").split(",")
    if email.strip()
}

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


class PortfolioStockCreate(BaseModel):
    symbol: str
    quantity: float
    buy_price: float


class BlogCreate(BaseModel):
    title: str
    content: str
    excerpt: str = ""
    cover_image: str = ""
    tags: List[str] = Field(default_factory=list)
    published: bool = False


class UserRoleUpdate(BaseModel):
    role: str


def generate_user_id() -> str:
    return f"user_{uuid.uuid4().hex[:12]}"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: str) -> str:
    payload = {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def parse_bearer_token(raw_token: str) -> Dict[str, Any]:
    if not raw_token:
        raise HTTPException(status_code=401, detail="Missing token")

    try:
        decoded = jwt.decode(raw_token, JWT_SECRET, algorithms=["HS256"])
        return {"user_id": decoded.get("user_id")}
    except Exception:
        pass

    try:
        decoded = jwt.decode(
            raw_token,
            options={"verify_signature": False, "verify_aud": False, "verify_exp": False},
            algorithms=["HS256", "RS256"],
        )
        return {
            "user_id": decoded.get("user_id") or decoded.get("sub") or decoded.get("uid"),
            "email": decoded.get("email"),
            "name": decoded.get("name"),
        }
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


async def ensure_user_from_token(token_payload: Dict[str, Any]) -> Dict[str, Any]:
    user_id = token_payload.get("user_id") or generate_user_id()
    email = (token_payload.get("email") or f"{user_id}@firebase.local").lower()
    name = token_payload.get("name") or email.split("@")[0]

    user = await db.users.find_one({"$or": [{"user_id": user_id}, {"email": email}]})
    if not user:
        user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "analyses_used": 0,
            "plan": "free",
            "role": "admin" if email in ADMIN_EMAILS else "user",
        }
        await db.users.insert_one(user)
    elif email in ADMIN_EMAILS and user.get("role") != "admin":
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"role": "admin"}})
        user["role"] = "admin"

    return user


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Unauthorized")
    payload = parse_bearer_token(credentials.credentials)
    return await ensure_user_from_token(payload)


async def require_admin(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


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
    rows = []
    for idx, row in hist.tail(30).iterrows():
        rows.append({"date": idx.strftime("%Y-%m-%d"), "price": round(safe_float(row.get("Close")), 2)})
    return rows


def heuristic_analysis(change_percent: float, pe_ratio: float, roe: float) -> Dict[str, Any]:
    score = int(change_percent > 1) + int(5 <= pe_ratio <= 35) + int(roe >= 12)
    verdict = "BUY" if score >= 3 else "HOLD" if score == 2 else "SELL"
    return {
        "verdict": verdict,
        "confidence": min(92, 55 + score * 12),
        "reasoning": [
            f"Price momentum is {change_percent:.2f}% today.",
            f"P/E ratio is {pe_ratio:.2f}, indicating valuation context.",
            f"ROE stands at {roe:.2f}% for profitability signal.",
        ],
        "risks": [
            "Market volatility can invalidate short-term momentum.",
            "Macro-economic events may impact sector performance.",
            "Always validate with your own risk profile and horizon.",
        ],
    }


async def groq_stock_analysis(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if not GROQ_API_KEY:
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

    url = "https://api.groq.com/openai/v1/chat/completions"
    body = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": "Return only valid JSON."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=25) as client_http:
            response = await client_http.post(url, json=body, headers=headers)
            response.raise_for_status()
            data = response.json()
            text = data["choices"][0]["message"]["content"]
            parsed = json.loads(text)
    except Exception as exc:
        logger.warning("Groq analysis failed, using fallback: %s", exc)
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
async def analyze_stock(symbol: str, user: Dict[str, Any] = Depends(get_current_user)):
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

    ai = await groq_stock_analysis(input_payload) or heuristic_analysis(change_percent, pe_ratio, roe)

    analysis_result = {
        "id": uuid.uuid4().hex,
        "user_id": user["user_id"],
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
        "fundamentals": {
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
        },
        "disclaimer": "AI-generated analysis for educational purposes only, not financial advice.",
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "analysis_engine": f"{GROQ_MODEL} via Groq API" if GROQ_API_KEY else "Heuristic fallback",
        "data_source": "Yahoo Finance",
    }

    await db.stock_analyses.insert_one(analysis_result)
    await db.users.update_one({"user_id": user["user_id"]}, {"$inc": {"analyses_used": 1}})
    return {k: v for k, v in analysis_result.items() if k not in {"_id", "user_id"}}


@api_router.get("/stocks/recent")
async def recent_stock_analyses(user: Dict[str, Any] = Depends(get_current_user)):
    docs = await db.stock_analyses.find({"user_id": user["user_id"]}, {"_id": 0, "user_id": 0}).sort("analyzed_at", -1).to_list(12)
    return docs


@api_router.post("/track/visit")
async def track_visit(payload: Dict[str, Any], request: Request):
    await db.page_visits.insert_one({
        "id": uuid.uuid4().hex,
        "page": payload.get("page", "/"),
        "referrer": payload.get("referrer"),
        "ip": request.client.host if request.client else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"ok": True}


@api_router.get("/auth/me")
async def auth_me(user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "user_id": user["user_id"],
        "email": user.get("email"),
        "name": user.get("name"),
        "plan": user.get("plan", "free"),
        "role": user.get("role", "user"),
        "analyses_used": user.get("analyses_used", 0),
        "analyses_limit": 100 if user.get("plan") == "pro" else 5,
    }


@api_router.get("/portfolio")
async def get_portfolio(user: Dict[str, Any] = Depends(get_current_user)):
    stocks = await db.portfolio.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(200)
    total_invested = sum(safe_float(item.get("buy_price")) * safe_float(item.get("quantity")) for item in stocks)
    return {
        "stocks": stocks,
        "summary": {
            "total_stocks": len(stocks),
            "invested": round(total_invested, 2),
            "current_value": round(total_invested, 2),
            "total_pnl": 0,
        },
    }


@api_router.post("/portfolio/add")
async def add_portfolio_stock(stock: PortfolioStockCreate, user: Dict[str, Any] = Depends(get_current_user)):
    entry = {
        "id": uuid.uuid4().hex,
        "user_id": user["user_id"],
        "symbol": stock.symbol.upper(),
        "quantity": stock.quantity,
        "buy_price": stock.buy_price,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.portfolio.insert_one(entry)
    return {"ok": True, "stock": entry}


@api_router.delete("/portfolio/{stock_id}")
async def remove_portfolio_stock(stock_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    result = await db.portfolio.delete_one({"id": stock_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Stock not found")
    return {"ok": True}


@api_router.get("/plans")
async def get_plans():
    return [
        {"id": "free", "name": "Free", "price": 0, "analyses_limit": 5, "features": ["5 analyses/mo", "Portfolio tracking"]},
        {"id": "pro", "name": "Pro", "price": 999, "analyses_limit": 100, "features": ["100 analyses/mo", "Priority AI analysis", "Admin support"]},
    ]


@api_router.get("/mutualfunds")
async def get_mutual_funds(user: Dict[str, Any] = Depends(get_current_user)):
    return [
        {"id": "mf_1", "name": "Nifty 50 Index Fund", "category": "Index", "returns_1y": 14.2, "risk": "Moderate"},
        {"id": "mf_2", "name": "Flexi Cap Opportunities", "category": "Flexi Cap", "returns_1y": 18.1, "risk": "High"},
    ]


@api_router.get("/mutualfunds/{fund_id}")
async def get_mutual_fund_detail(fund_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    funds = await get_mutual_funds(user)
    found = next((fund for fund in funds if fund["id"] == fund_id), None)
    if not found:
        raise HTTPException(status_code=404, detail="Fund not found")
    found["aum"] = "₹4,200 Cr"
    found["expense_ratio"] = "0.45%"
    return found


@api_router.get("/blogs")
async def list_blogs():
    docs = await db.blogs.find({"published": True}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return docs


@api_router.get("/blogs/{blog_id}")
async def get_blog(blog_id: str):
    blog = await db.blogs.find_one({"id": blog_id}, {"_id": 0})
    if not blog or (not blog.get("published")):
        raise HTTPException(status_code=404, detail="Blog not found")
    await db.blogs.update_one({"id": blog_id}, {"$inc": {"views": 1}})
    blog["views"] = blog.get("views", 0) + 1
    return blog


@api_router.get("/admin/users")
async def admin_users(admin: Dict[str, Any] = Depends(require_admin)):
    docs = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return docs


@api_router.patch("/admin/users/{user_id}/role")
async def admin_set_user_role(user_id: str, payload: UserRoleUpdate, admin: Dict[str, Any] = Depends(require_admin)):
    role = payload.role.lower().strip()
    if role not in {"user", "admin"}:
        raise HTTPException(status_code=400, detail="Role must be user or admin")
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": role}})
    return {"ok": True}


@api_router.get("/admin/stats")
async def admin_stats(admin: Dict[str, Any] = Depends(require_admin)):
    users_count = await db.users.count_documents({})
    analyses_count = await db.stock_analyses.count_documents({})
    blogs_count = await db.blogs.count_documents({})
    visits_count = await db.page_visits.count_documents({})
    by_page = await db.page_visits.aggregate([
        {"$group": {"_id": "$page", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 7},
    ]).to_list(20)
    return {
        "users": users_count,
        "analyses": analyses_count,
        "blogs": blogs_count,
        "visits": visits_count,
        "page_views": [{"page": x.get("_id", "/"), "visits": x.get("count", 0)} for x in by_page],
    }


@api_router.get("/admin/blogs")
async def admin_list_blogs(admin: Dict[str, Any] = Depends(require_admin)):
    return await db.blogs.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api_router.post("/admin/blogs")
async def admin_create_blog(payload: BlogCreate, admin: Dict[str, Any] = Depends(require_admin)):
    now = datetime.now(timezone.utc).isoformat()
    blog = {
        "id": f"blog_{uuid.uuid4().hex[:10]}",
        "title": payload.title,
        "content": payload.content,
        "excerpt": payload.excerpt or payload.content[:160],
        "cover_image": payload.cover_image,
        "tags": payload.tags,
        "published": payload.published,
        "author_name": admin.get("name", "Admin"),
        "views": 0,
        "created_at": now,
        "updated_at": now,
    }
    await db.blogs.insert_one(blog)
    return blog


@api_router.put("/admin/blogs/{blog_id}")
async def admin_update_blog(blog_id: str, payload: BlogCreate, admin: Dict[str, Any] = Depends(require_admin)):
    update = {
        "title": payload.title,
        "content": payload.content,
        "excerpt": payload.excerpt or payload.content[:160],
        "cover_image": payload.cover_image,
        "tags": payload.tags,
        "published": payload.published,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.blogs.update_one({"id": blog_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Blog not found")
    doc = await db.blogs.find_one({"id": blog_id}, {"_id": 0})
    return doc


@api_router.delete("/admin/blogs/{blog_id}")
async def admin_delete_blog(blog_id: str, admin: Dict[str, Any] = Depends(require_admin)):
    result = await db.blogs.delete_one({"id": blog_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blog not found")
    return {"ok": True}


@app.get("/health")
async def root_health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


@api_router.get("/config/health")
async def config_health():
    return {
        "status": "ok",
        "time": datetime.now(timezone.utc).isoformat(),
        "config": {
            "groq": {"configured": bool(GROQ_API_KEY), "model": GROQ_MODEL},
            "database": {"name": DB_NAME},
            "admin_emails_configured": len(ADMIN_EMAILS),
        },
    }


@api_router.post("/auth/signup")
async def signup(user: UserCreate):
    if await db.users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already exists")

    user_id = generate_user_id()
    role = "admin" if user.email.lower() in ADMIN_EMAILS else "user"
    await db.users.insert_one({
        "user_id": user_id,
        "email": user.email.lower(),
        "name": user.name,
        "password_hash": hash_password(user.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "analyses_used": 0,
        "plan": "free",
        "role": role,
    })

    return {"token": create_token(user_id)}


@api_router.post("/auth/login")
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email.lower()})
    if not db_user or not verify_password(user.password, db_user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {"token": create_token(db_user["user_id"])}


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
