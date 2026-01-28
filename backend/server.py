from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'clearmarket_secret')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
ALPHA_VANTAGE_KEY = os.environ.get('ALPHA_VANTAGE_KEY', 'demo')

# Create the main app
app = FastAPI(title="ClearMarket API")

# Create a router with /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str
    role: str
    plan: str
    analyses_used: int
    analyses_limit: int
    created_at: str

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class PortfolioStockAdd(BaseModel):
    symbol: str
    quantity: float
    buy_price: float

class PortfolioStockResponse(BaseModel):
    id: str
    symbol: str
    quantity: float
    buy_price: float
    added_at: str

class StockAnalysisResponse(BaseModel):
    symbol: str
    name: str
    exchange: str
    current_price: float
    change_percent: float
    verdict: str
    confidence: int
    reasoning: List[str]
    risks: List[str]
    fundamentals: dict
    price_history: List[dict]
    analyzed_at: str

class PlanInfo(BaseModel):
    id: str
    name: str
    price: int
    analyses_limit: int
    features: List[str]

class BlogCreate(BaseModel):
    title: str
    content: str
    excerpt: str
    cover_image: Optional[str] = None
    tags: List[str] = []
    published: bool = False

class BlogUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    excerpt: Optional[str] = None
    cover_image: Optional[str] = None
    tags: Optional[List[str]] = None
    published: Optional[bool] = None

class PageVisit(BaseModel):
    page: str
    referrer: Optional[str] = None

# ============== HELPER FUNCTIONS ==============

def generate_user_id():
    return f"user_{uuid.uuid4().hex[:12]}"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

async def get_current_user(request: Request, credentials=Depends(security)):
    # Check cookie first
    session_token = request.cookies.get('session_token')
    
    if session_token:
        # Validate session from DB
        session = await db.user_sessions.find_one({'session_token': session_token}, {'_id': 0})
        if session:
            expires_at = session.get('expires_at')
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one({'user_id': session['user_id']}, {'_id': 0})
                if user:
                    return user
    
    # Fallback to JWT token
    if credentials:
        try:
            payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=['HS256'])
            user = await db.users.find_one({'user_id': payload['user_id']}, {'_id': 0})
            if user:
                return user
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    raise HTTPException(status_code=401, detail="Not authenticated")

async def get_optional_user(request: Request, credentials=Depends(security)):
    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None

# Plan definitions
PLANS = {
    'free': {'name': 'Free', 'price': 0, 'analyses_limit': 5, 'features': ['5 analyses/month', 'Basic fundamentals', 'Email support']},
    'basic': {'name': 'Basic', 'price': 599, 'analyses_limit': 30, 'features': ['30 analyses/month', 'Full fundamentals', 'PDF reports', 'Priority support']},
    'pro': {'name': 'Pro', 'price': 1299, 'analyses_limit': 100, 'features': ['100 analyses/month', 'Full fundamentals', 'PDF reports', 'Portfolio insights', 'Priority support']},
    'premium': {'name': 'Premium', 'price': 1999, 'analyses_limit': 500, 'features': ['500 analyses/month', 'Full fundamentals', 'PDF reports', 'Portfolio insights', 'Mutual fund analysis', '24/7 support']}
}

# Mock stock data for Indian stocks
MOCK_STOCKS = {
    'RELIANCE': {'name': 'Reliance Industries Ltd', 'exchange': 'NSE', 'sector': 'Oil & Gas', 'price': 2847.50, 'pe': 27.5, 'market_cap': 1925000, 'dividend_yield': 0.35},
    'TCS': {'name': 'Tata Consultancy Services', 'exchange': 'NSE', 'sector': 'IT', 'price': 4125.80, 'pe': 32.1, 'market_cap': 1490000, 'dividend_yield': 1.2},
    'HDFCBANK': {'name': 'HDFC Bank Ltd', 'exchange': 'NSE', 'sector': 'Banking', 'price': 1678.25, 'pe': 19.8, 'market_cap': 1280000, 'dividend_yield': 1.1},
    'INFY': {'name': 'Infosys Ltd', 'exchange': 'NSE', 'sector': 'IT', 'price': 1842.40, 'pe': 28.9, 'market_cap': 765000, 'dividend_yield': 2.3},
    'ICICIBANK': {'name': 'ICICI Bank Ltd', 'exchange': 'NSE', 'sector': 'Banking', 'price': 1245.60, 'pe': 18.2, 'market_cap': 875000, 'dividend_yield': 0.8},
    'TATAMOTORS': {'name': 'Tata Motors Ltd', 'exchange': 'NSE', 'sector': 'Automobile', 'price': 987.30, 'pe': 8.5, 'market_cap': 367000, 'dividend_yield': 0.5},
    'WIPRO': {'name': 'Wipro Ltd', 'exchange': 'NSE', 'sector': 'IT', 'price': 475.20, 'pe': 22.4, 'market_cap': 248000, 'dividend_yield': 0.4},
    'BHARTIARTL': {'name': 'Bharti Airtel Ltd', 'exchange': 'NSE', 'sector': 'Telecom', 'price': 1567.80, 'pe': 45.2, 'market_cap': 890000, 'dividend_yield': 0.5},
    'SBIN': {'name': 'State Bank of India', 'exchange': 'NSE', 'sector': 'Banking', 'price': 825.40, 'pe': 11.2, 'market_cap': 736000, 'dividend_yield': 1.8},
    'ASIANPAINT': {'name': 'Asian Paints Ltd', 'exchange': 'NSE', 'sector': 'Consumer', 'price': 2890.65, 'pe': 58.7, 'market_cap': 277000, 'dividend_yield': 0.6}
}

def generate_price_history(base_price: float, days: int = 30) -> List[dict]:
    import random
    history = []
    price = base_price * 0.95
    for i in range(days):
        date = (datetime.now(timezone.utc) - timedelta(days=days-i)).strftime('%Y-%m-%d')
        change = random.uniform(-0.03, 0.035)
        price = price * (1 + change)
        history.append({'date': date, 'price': round(price, 2)})
    return history

# ============== AUTH ROUTES ==============

@api_router.post("/auth/signup", response_model=TokenResponse)
async def signup(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({'email': user_data.email}, {'_id': 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = generate_user_id()
    user_doc = {
        'user_id': user_id,
        'email': user_data.email,
        'name': user_data.name,
        'password_hash': hash_password(user_data.password),
        'role': 'user',
        'plan': 'free',
        'analyses_used': 0,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    plan = PLANS[user_doc['plan']]
    
    return TokenResponse(
        token=token,
        user=UserResponse(
            user_id=user_id,
            email=user_doc['email'],
            name=user_doc['name'],
            role=user_doc['role'],
            plan=user_doc['plan'],
            analyses_used=user_doc['analyses_used'],
            analyses_limit=plan['analyses_limit'],
            created_at=user_doc['created_at']
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    user = await db.users.find_one({'email': user_data.email}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(user_data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['user_id'])
    plan = PLANS.get(user['plan'], PLANS['free'])
    
    return TokenResponse(
        token=token,
        user=UserResponse(
            user_id=user['user_id'],
            email=user['email'],
            name=user['name'],
            role=user['role'],
            plan=user['plan'],
            analyses_used=user.get('analyses_used', 0),
            analyses_limit=plan['analyses_limit'],
            created_at=user['created_at']
        )
    )

# REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
@api_router.get("/auth/session")
async def process_session(session_id: str, response: Response):
    """Process Emergent OAuth session_id and create local session"""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            oauth_data = resp.json()
    except Exception as e:
        logger.error(f"OAuth session error: {e}")
        raise HTTPException(status_code=401, detail="OAuth validation failed")
    
    # Check if user exists
    user = await db.users.find_one({'email': oauth_data['email']}, {'_id': 0})
    
    if not user:
        # Create new user
        user_id = generate_user_id()
        user = {
            'user_id': user_id,
            'email': oauth_data['email'],
            'name': oauth_data['name'],
            'picture': oauth_data.get('picture'),
            'role': 'user',
            'plan': 'free',
            'analyses_used': 0,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)
    else:
        user_id = user['user_id']
        # Update name/picture if changed
        await db.users.update_one(
            {'user_id': user_id},
            {'$set': {'name': oauth_data['name'], 'picture': oauth_data.get('picture')}}
        )
    
    # Create session
    session_token = f"session_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        'user_id': user_id,
        'session_token': session_token,
        'expires_at': expires_at.isoformat(),
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    plan = PLANS.get(user.get('plan', 'free'), PLANS['free'])
    
    return {
        'user_id': user_id,
        'email': user.get('email', oauth_data['email']),
        'name': user.get('name', oauth_data['name']),
        'picture': user.get('picture', oauth_data.get('picture')),
        'role': user.get('role', 'user'),
        'plan': user.get('plan', 'free'),
        'analyses_used': user.get('analyses_used', 0),
        'analyses_limit': plan['analyses_limit']
    }

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    plan = PLANS.get(user.get('plan', 'free'), PLANS['free'])
    return {
        'user_id': user['user_id'],
        'email': user['email'],
        'name': user['name'],
        'picture': user.get('picture'),
        'role': user['role'],
        'plan': user['plan'],
        'analyses_used': user.get('analyses_used', 0),
        'analyses_limit': plan['analyses_limit']
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get('session_token')
    if session_token:
        await db.user_sessions.delete_one({'session_token': session_token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ============== STOCK ANALYSIS ROUTES ==============

@api_router.get("/stocks/search")
async def search_stocks(q: str = ""):
    """Search stocks by symbol or name"""
    results = []
    q_upper = q.upper()
    for symbol, data in MOCK_STOCKS.items():
        if q_upper in symbol or q.lower() in data['name'].lower():
            results.append({
                'symbol': symbol,
                'name': data['name'],
                'exchange': data['exchange'],
                'sector': data['sector']
            })
    return results[:10]

@api_router.get("/stocks/analyze/{symbol}")
async def analyze_stock(symbol: str, user=Depends(get_current_user)):
    """Analyze a stock and return Buy/Hold/Sell verdict with AI reasoning"""
    symbol = symbol.upper()
    
    # Check if user already has this analysis (free re-read)
    existing_analysis = await db.stock_analyses.find_one(
        {'user_id': user['user_id'], 'symbol': symbol},
        {'_id': 0}
    )
    if existing_analysis:
        # Return cached analysis without counting
        return existing_analysis
    
    # Check usage limit for new analysis
    plan = PLANS.get(user.get('plan', 'free'), PLANS['free'])
    if user.get('analyses_used', 0) >= plan['analyses_limit']:
        raise HTTPException(status_code=403, detail="Analysis limit reached. Please upgrade your plan.")
    
    # Get stock data (mock or API)
    if symbol in MOCK_STOCKS:
        stock_data = MOCK_STOCKS[symbol]
    else:
        # Return mock data for unknown symbols
        stock_data = {
            'name': f'{symbol} Ltd',
            'exchange': 'NSE',
            'sector': 'Unknown',
            'price': 1000.0,
            'pe': 25.0,
            'market_cap': 100000,
            'dividend_yield': 1.0
        }
    
    # Generate AI analysis using Gemini
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"analysis_{symbol}_{user['user_id']}",
            system_message="""You are a professional stock analyst for Indian retail investors. 
            Provide clear, jargon-free analysis. Focus on long-term investing, not trading.
            Always include a disclaimer that this is not financial advice.
            Be deterministic and factual. Explain in simple terms."""
        ).with_model("gemini", "gemini-3-flash-preview")
        
        prompt = f"""Analyze this Indian stock for a retail investor:
        
Stock: {symbol} - {stock_data['name']}
Sector: {stock_data['sector']}
Current Price: ₹{stock_data['price']}
P/E Ratio: {stock_data['pe']}
Market Cap: ₹{stock_data['market_cap']} Cr
Dividend Yield: {stock_data['dividend_yield']}%

Provide analysis in this exact JSON format:
{{
    "verdict": "BUY" or "HOLD" or "SELL",
    "confidence": number between 1-100,
    "reasoning": ["reason1", "reason2", "reason3", "reason4"],
    "risks": ["risk1", "risk2", "risk3"]
}}

Consider: PE ratio (industry avg ~25), market cap stability, sector outlook, dividend yield.
For PE < 15: potentially undervalued
For PE 15-30: fairly valued
For PE > 30: potentially overvalued"""

        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        # Parse JSON from response
        import json
        import re
        json_match = re.search(r'\{[^{}]*\}', response, re.DOTALL)
        if json_match:
            analysis = json.loads(json_match.group())
        else:
            # Fallback analysis based on PE
            pe = stock_data['pe']
            if pe < 15:
                verdict, confidence = "BUY", 75
            elif pe < 30:
                verdict, confidence = "HOLD", 60
            else:
                verdict, confidence = "HOLD", 50
            analysis = {
                "verdict": verdict,
                "confidence": confidence,
                "reasoning": [
                    f"PE ratio of {pe} indicates {'undervaluation' if pe < 15 else 'fair valuation'}",
                    f"Strong market presence in {stock_data['sector']} sector",
                    f"Market cap of ₹{stock_data['market_cap']} Cr shows stability",
                    f"Dividend yield of {stock_data['dividend_yield']}% provides income"
                ],
                "risks": [
                    "Market volatility can affect short-term prices",
                    "Sector-specific regulatory changes possible",
                    "Economic slowdown may impact earnings"
                ]
            }
    except Exception as e:
        logger.error(f"AI analysis error: {e}")
        # Fallback to rule-based analysis
        pe = stock_data['pe']
        if pe < 15:
            verdict, confidence = "BUY", 70
        elif pe < 30:
            verdict, confidence = "HOLD", 60
        else:
            verdict, confidence = "HOLD", 50
        analysis = {
            "verdict": verdict,
            "confidence": confidence,
            "reasoning": [
                f"PE ratio of {pe} suggests {'value opportunity' if pe < 15 else 'fair pricing'}",
                f"Leading player in {stock_data['sector']} sector",
                f"Market cap of ₹{stock_data['market_cap']} Cr indicates stability",
                f"Dividend yield of {stock_data['dividend_yield']}% for passive income"
            ],
            "risks": [
                "Market conditions can change quickly",
                "Sector headwinds possible",
                "Past performance doesn't guarantee future returns"
            ]
        }
    
    # Update usage count
    await db.users.update_one(
        {'user_id': user['user_id']},
        {'$inc': {'analyses_used': 1}}
    )
    
    # Log analysis
    await db.analysis_logs.insert_one({
        'user_id': user['user_id'],
        'symbol': symbol,
        'verdict': analysis['verdict'],
        'analyzed_at': datetime.now(timezone.utc).isoformat()
    })
    
    import random
    change_percent = round(random.uniform(-2.5, 3.5), 2)
    
    analysis_result = {
        'symbol': symbol,
        'name': stock_data['name'],
        'exchange': stock_data['exchange'],
        'current_price': stock_data['price'],
        'change_percent': change_percent,
        'verdict': analysis['verdict'],
        'confidence': analysis['confidence'],
        'reasoning': analysis['reasoning'],
        'risks': analysis['risks'],
        'fundamentals': {
            'pe_ratio': stock_data['pe'],
            'market_cap': stock_data['market_cap'],
            'market_cap_display': f"₹{stock_data['market_cap']:,} Cr",
            'dividend_yield': stock_data['dividend_yield'],
            'sector': stock_data['sector'],
            'eps': round(stock_data['price'] / stock_data['pe'], 2),
            'book_value': round(stock_data['price'] / (stock_data['pe'] * 0.4), 2),
            'debt_to_equity': round(random.uniform(0.2, 1.5), 2),
            'roe': round(random.uniform(12, 28), 1),
            '52_week_high': round(stock_data['price'] * 1.15, 2),
            '52_week_low': round(stock_data['price'] * 0.75, 2)
        },
        'price_history': generate_price_history(stock_data['price']),
        'analyzed_at': datetime.now(timezone.utc).isoformat(),
        'disclaimer': "This analysis is for informational purposes only and does not constitute financial advice. Please consult a qualified financial advisor before making investment decisions.",
        'user_id': user['user_id']
    }
    
    # Store analysis for future re-reads
    await db.stock_analyses.insert_one(analysis_result)
    
    return analysis_result

@api_router.get("/stocks/recent")
async def get_recent_analyses(user=Depends(get_current_user)):
    """Get user's recent stock analyses"""
    logs = await db.analysis_logs.find(
        {'user_id': user['user_id']},
        {'_id': 0}
    ).sort('analyzed_at', -1).limit(10).to_list(10)
    
    # Enrich with stock names
    for log in logs:
        if log['symbol'] in MOCK_STOCKS:
            log['name'] = MOCK_STOCKS[log['symbol']]['name']
        else:
            log['name'] = f"{log['symbol']} Ltd"
    
    return logs

@api_router.get("/stocks/saved")
async def get_saved_analyses(user=Depends(get_current_user)):
    """Get all user's saved stock analyses (full reports)"""
    analyses = await db.stock_analyses.find(
        {'user_id': user['user_id']},
        {'_id': 0}
    ).sort('analyzed_at', -1).to_list(100)
    return analyses

# ============== PORTFOLIO ROUTES ==============

@api_router.get("/portfolio")
async def get_portfolio(user=Depends(get_current_user)):
    """Get user's portfolio with real-time P&L calculation"""
    import random
    
    stocks = await db.portfolio_stocks.find(
        {'user_id': user['user_id']},
        {'_id': 0}
    ).to_list(100)
    
    total_invested = 0
    total_current = 0
    
    for stock in stocks:
        stock_data = MOCK_STOCKS.get(stock['symbol'], {'price': stock['buy_price'], 'name': stock['symbol']})
        
        # Simulate realistic price fluctuation (±3% daily variation)
        base_price = stock_data['price']
        fluctuation = random.uniform(-0.03, 0.03)
        current_price = round(base_price * (1 + fluctuation), 2)
        day_change = round(fluctuation * 100, 2)
        
        # Calculate P&L
        invested = stock['quantity'] * stock['buy_price']
        current = stock['quantity'] * current_price
        profit_loss = current - invested
        profit_loss_percent = ((profit_loss) / invested) * 100 if invested > 0 else 0
        
        stock['current_price'] = current_price
        stock['day_change'] = day_change
        stock['invested_value'] = round(invested, 2)
        stock['current_value'] = round(current, 2)
        stock['profit_loss'] = round(profit_loss, 2)
        stock['profit_loss_percent'] = round(profit_loss_percent, 2)
        stock['name'] = stock_data.get('name', stock['symbol'])
        stock['sector'] = stock_data.get('sector', 'Unknown')
        
        total_invested += invested
        total_current += current
    
    return {
        'stocks': stocks,
        'summary': {
            'total_invested': round(total_invested, 2),
            'total_current': round(total_current, 2),
            'total_profit_loss': round(total_current - total_invested, 2),
            'total_profit_loss_percent': round(((total_current - total_invested) / total_invested) * 100, 2) if total_invested > 0 else 0,
            'stock_count': len(stocks)
        }
    }

@api_router.post("/portfolio/add")
async def add_to_portfolio(stock: PortfolioStockAdd, user=Depends(get_current_user)):
    """Add stock to portfolio"""
    stock_id = f"ps_{uuid.uuid4().hex[:12]}"
    doc = {
        'id': stock_id,
        'user_id': user['user_id'],
        'symbol': stock.symbol.upper(),
        'quantity': stock.quantity,
        'buy_price': stock.buy_price,
        'added_at': datetime.now(timezone.utc).isoformat()
    }
    await db.portfolio_stocks.insert_one(doc)
    return {'id': stock_id, 'message': 'Stock added to portfolio'}

@api_router.delete("/portfolio/{stock_id}")
async def remove_from_portfolio(stock_id: str, user=Depends(get_current_user)):
    """Remove stock from portfolio"""
    result = await db.portfolio_stocks.delete_one({
        'id': stock_id,
        'user_id': user['user_id']
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Stock not found in portfolio")
    return {'message': 'Stock removed from portfolio'}

# ============== PLANS ROUTES ==============

@api_router.get("/plans")
async def get_plans():
    """Get available subscription plans"""
    return [
        {'id': k, **v} for k, v in PLANS.items()
    ]

# ============== ADMIN ROUTES ==============

@api_router.get("/admin/users")
async def get_all_users(user=Depends(get_current_user)):
    """Admin: Get all users"""
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {'_id': 0, 'password_hash': 0}).to_list(1000)
    return users

@api_router.get("/admin/stats")
async def get_admin_stats(user=Depends(get_current_user)):
    """Admin: Get platform statistics"""
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = await db.users.count_documents({})
    total_analyses = await db.analysis_logs.count_documents({})
    total_blogs = await db.blogs.count_documents({})
    
    plan_distribution = {}
    for plan_id in PLANS.keys():
        count = await db.users.count_documents({'plan': plan_id})
        plan_distribution[plan_id] = count
    
    # Page visit analytics
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    visits_today = await db.page_visits.count_documents({'timestamp': {'$gte': today.isoformat()}})
    visits_week = await db.page_visits.count_documents({'timestamp': {'$gte': week_ago.isoformat()}})
    visits_month = await db.page_visits.count_documents({'timestamp': {'$gte': month_ago.isoformat()}})
    
    # Page breakdown
    pipeline = [
        {'$match': {'timestamp': {'$gte': week_ago.isoformat()}}},
        {'$group': {'_id': '$page', 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}},
        {'$limit': 10}
    ]
    page_breakdown = await db.page_visits.aggregate(pipeline).to_list(10)
    
    # Daily visits for last 7 days
    daily_visits = []
    for i in range(7):
        day_start = today - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        count = await db.page_visits.count_documents({
            'timestamp': {'$gte': day_start.isoformat(), '$lt': day_end.isoformat()}
        })
        daily_visits.append({
            'date': day_start.strftime('%Y-%m-%d'),
            'visits': count
        })
    daily_visits.reverse()
    
    return {
        'total_users': total_users,
        'total_analyses': total_analyses,
        'total_blogs': total_blogs,
        'plan_distribution': plan_distribution,
        'analytics': {
            'visits_today': visits_today,
            'visits_week': visits_week,
            'visits_month': visits_month,
            'page_breakdown': page_breakdown,
            'daily_visits': daily_visits
        }
    }

@api_router.put("/admin/user/{user_id}/role")
async def update_user_role(user_id: str, role: str, user=Depends(get_current_user)):
    """Admin: Update user role"""
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if role not in ['user', 'admin']:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one(
        {'user_id': user_id},
        {'$set': {'role': role}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {'message': 'Role updated'}

@api_router.put("/admin/user/{user_id}/plan")
async def update_user_plan(user_id: str, plan: str, user=Depends(get_current_user)):
    """Admin: Update user subscription plan"""
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if plan not in PLANS.keys():
        raise HTTPException(status_code=400, detail="Invalid plan. Valid plans: free, basic, pro, premium")
    
    # Reset analyses_used when upgrading plan
    result = await db.users.update_one(
        {'user_id': user_id},
        {'$set': {'plan': plan, 'analyses_used': 0}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {'message': f'Plan updated to {plan}'}

# ============== BLOG ROUTES ==============

@api_router.get("/blogs")
async def get_blogs(published_only: bool = True):
    """Get all blogs (published only for public)"""
    query = {'published': True} if published_only else {}
    blogs = await db.blogs.find(query, {'_id': 0}).sort('created_at', -1).to_list(100)
    return blogs

@api_router.get("/blogs/{blog_id}")
async def get_blog(blog_id: str):
    """Get single blog by ID"""
    blog = await db.blogs.find_one({'id': blog_id}, {'_id': 0})
    if not blog:
        raise HTTPException(status_code=404, detail="Blog not found")
    if not blog.get('published'):
        raise HTTPException(status_code=404, detail="Blog not found")
    
    # Increment view count
    await db.blogs.update_one({'id': blog_id}, {'$inc': {'views': 1}})
    blog['views'] = blog.get('views', 0) + 1
    return blog

@api_router.post("/admin/blogs")
async def create_blog(blog: BlogCreate, user=Depends(get_current_user)):
    """Admin: Create a new blog"""
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    blog_id = f"blog_{uuid.uuid4().hex[:12]}"
    slug = blog.title.lower().replace(' ', '-').replace('?', '').replace('!', '')[:50]
    
    blog_doc = {
        'id': blog_id,
        'slug': slug,
        'title': blog.title,
        'content': blog.content,
        'excerpt': blog.excerpt,
        'cover_image': blog.cover_image,
        'tags': blog.tags,
        'published': blog.published,
        'author_id': user['user_id'],
        'author_name': user['name'],
        'views': 0,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    await db.blogs.insert_one(blog_doc)
    return {'id': blog_id, 'message': 'Blog created successfully'}

@api_router.get("/admin/blogs")
async def get_all_blogs_admin(user=Depends(get_current_user)):
    """Admin: Get all blogs including drafts"""
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    blogs = await db.blogs.find({}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return blogs

@api_router.put("/admin/blogs/{blog_id}")
async def update_blog(blog_id: str, blog: BlogUpdate, user=Depends(get_current_user)):
    """Admin: Update a blog"""
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = {k: v for k, v in blog.model_dump().items() if v is not None}
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.blogs.update_one({'id': blog_id}, {'$set': update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Blog not found")
    return {'message': 'Blog updated successfully'}

@api_router.delete("/admin/blogs/{blog_id}")
async def delete_blog(blog_id: str, user=Depends(get_current_user)):
    """Admin: Delete a blog"""
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.blogs.delete_one({'id': blog_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blog not found")
    return {'message': 'Blog deleted successfully'}

# ============== PAGE VISIT TRACKING ==============

@api_router.post("/track/visit")
async def track_page_visit(visit: PageVisit, request: Request):
    """Track page visit for analytics"""
    visit_doc = {
        'id': f"visit_{uuid.uuid4().hex[:12]}",
        'page': visit.page,
        'referrer': visit.referrer,
        'user_agent': request.headers.get('user-agent', ''),
        'timestamp': datetime.now(timezone.utc).isoformat()
    }
    await db.page_visits.insert_one(visit_doc)
    return {'message': 'Visit tracked'}

# ============== MUTUAL FUND ROUTES ==============

MOCK_MUTUAL_FUNDS = [
    {'id': 'mf1', 'name': 'HDFC Flexi Cap Fund', 'category': 'Equity - Flexi Cap', 'risk': 'High', 'returns_1y': 18.5, 'returns_3y': 15.2, 'nav': 1245.67, 'aum': 45000, 'expense_ratio': 1.8},
    {'id': 'mf2', 'name': 'SBI Blue Chip Fund', 'category': 'Equity - Large Cap', 'risk': 'Moderate', 'returns_1y': 14.2, 'returns_3y': 12.8, 'nav': 67.89, 'aum': 38000, 'expense_ratio': 1.5},
    {'id': 'mf3', 'name': 'ICICI Pru Balanced Advantage', 'category': 'Hybrid - Balanced', 'risk': 'Low', 'returns_1y': 11.5, 'returns_3y': 10.2, 'nav': 52.34, 'aum': 52000, 'expense_ratio': 1.2},
    {'id': 'mf4', 'name': 'Axis Small Cap Fund', 'category': 'Equity - Small Cap', 'risk': 'Very High', 'returns_1y': 25.8, 'returns_3y': 22.5, 'nav': 89.45, 'aum': 15000, 'expense_ratio': 2.0},
    {'id': 'mf5', 'name': 'Kotak Debt Fund', 'category': 'Debt - Medium Duration', 'risk': 'Low', 'returns_1y': 7.2, 'returns_3y': 7.8, 'nav': 45.23, 'aum': 28000, 'expense_ratio': 0.8},
]

@api_router.get("/mutualfunds")
async def get_mutual_funds(category: str = None):
    """Get mutual funds list"""
    funds = MOCK_MUTUAL_FUNDS
    if category:
        funds = [f for f in funds if category.lower() in f['category'].lower()]
    return funds

@api_router.get("/mutualfunds/{fund_id}")
async def get_mutual_fund_detail(fund_id: str, user=Depends(get_current_user)):
    """Get mutual fund details with suitability"""
    fund = next((f for f in MOCK_MUTUAL_FUNDS if f['id'] == fund_id), None)
    if not fund:
        raise HTTPException(status_code=404, detail="Fund not found")
    
    # Add suitability based on risk
    risk_map = {
        'Low': 'Suitable for conservative investors seeking stable returns',
        'Moderate': 'Suitable for balanced investors with medium-term goals',
        'High': 'Suitable for aggressive investors with long-term horizon',
        'Very High': 'Suitable only for experienced investors with high risk appetite'
    }
    
    fund['suitability'] = risk_map.get(fund['risk'], 'Consult a financial advisor')
    fund['recommendation'] = 'CONSIDER' if fund['returns_3y'] > 10 else 'REVIEW'
    
    return fund

# ============== ROOT ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "ClearMarket API - Stock Analysis for Indian Investors"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
