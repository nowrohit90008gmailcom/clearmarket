# ClearMarket - AI Stock Analysis Platform

## Problem Statement
Build a full-stack, production-ready AI stock analysis web application for Indian retail investors investing ₹5,000–₹20,000 monthly. Provides simple Buy/Hold/Sell signals with clear reasoning, no jargon.

## User Personas
- **Primary**: Indian retail investors (25-45 years) with limited time for deep research
- **Secondary**: First-time investors seeking guidance in simple language
- **Admin**: Founder managing users, plans, and content

## Core Requirements (Static)
- JWT + Google OAuth authentication
- AI-powered stock analysis (Buy/Hold/Sell)
- Complete fundamentals (PE ratio, market cap, EPS, ROE, etc.)
- Manual portfolio tracking
- Mutual fund analysis
- Subscription plans (Free, Basic, Pro, Premium)
- Admin panel for user management
- Light/dark theme toggle
- Mobile-first responsive design

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI**: Gemini 3 Flash via Emergent Integrations
- **Auth**: JWT + Emergent Google OAuth
- **Payments**: Razorpay-ready structure

## What's Been Implemented (Dec 2025)

### Backend APIs ✅
- POST /api/auth/signup - User registration
- POST /api/auth/login - JWT authentication
- GET /api/auth/session - Google OAuth callback
- GET /api/auth/me - Current user info
- POST /api/auth/logout - Session termination
- GET /api/stocks/search - Stock search (10 Indian stocks)
- GET /api/stocks/analyze/:symbol - AI analysis with Gemini
- GET /api/stocks/recent - User's recent analyses
- GET/POST/DELETE /api/portfolio - Portfolio CRUD
- GET /api/plans - Subscription plans
- GET /api/mutualfunds - Mutual fund list
- GET /api/mutualfunds/:id - Fund details with suitability
- GET /api/admin/users - Admin user list
- GET /api/admin/stats - Platform statistics
- PUT /api/admin/user/:id/role - Role management

### Frontend Pages ✅
- Landing page with hero, features, how-it-works, CTA
- Login/Signup with Google OAuth
- Dashboard with usage stats, quick search, recent analyses
- Stock Analysis page with verdict, fundamentals, chart
- Portfolio page with holdings management
- Mutual Funds page with filtering
- Admin panel with user management
- Pricing page with plan comparison

### Features ✅
- Light/dark theme toggle
- Mobile-responsive design
- AI-powered analysis with confidence scores
- 30-day price history charts
- ClearMarket watermark on analyses
- Usage tracking per plan

## Mocked Components
- **Stock prices**: Using mock data for 10 Indian stocks (Alpha Vantage ready)
- **Payments**: Razorpay structure only, no live transactions
- **Mutual funds**: Mock fund data

## Prioritized Backlog

### P0 (Critical)
- None remaining - MVP complete

### P1 (High Priority)
- Razorpay payment integration
- Alpha Vantage live stock data
- PDF report generation with watermark
- Email verification flow

### P2 (Medium Priority)
- More stocks in database
- Real mutual fund data
- Portfolio performance charts
- Stock watchlist feature
- Email notifications for price alerts

### P3 (Low Priority)
- SEO auto-generated stock pages
- Social sharing features
- Mobile app wrapper
- Advanced admin analytics

## Next Tasks
1. Integrate Razorpay for live payments
2. Connect Alpha Vantage API for real stock data
3. Implement PDF report generation
4. Add more Indian stocks to the database
