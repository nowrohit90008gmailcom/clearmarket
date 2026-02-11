# ClearMarket - Easiest Hosting (File Manager + Safe API)

If you want to host like a normal static website from cPanel **File Manager**, use this setup:

- **Frontend**: upload React build to `public_html` (File Manager)
- **Backend API**: host separately (Railway/Render/VPS) and lock it down

This is the simplest + safest model for shared hosting.

---

## Recommended architecture (easy + safe)

1. Frontend on cPanel (static files)
2. API on separate backend host (not public_html)
3. MongoDB Atlas for database
4. CORS restricted to your frontend domain only

---

## 1) Deploy frontend from File Manager (5 minutes)

### Step A - Build frontend locally
From `frontend/`:

```bash
npm install
REACT_APP_BACKEND_URL=https://api.yourdomain.com npm run build
```

### Step B - Upload using cPanel File Manager
1. Open cPanel → **File Manager**
2. Go to `public_html`
3. Upload the **contents** of `frontend/build/` (not the folder itself)
4. Make sure `.htaccess` is present in `public_html` for React routes

`.htaccess` template already exists in this repo at:
- `frontend/public/.htaccess`

---

## 2) Deploy backend API safely (separate host)

Use Railway/Render/VPS for backend. Point it to your Atlas DB.

Required backend env vars:

- `APP_ENV=production`
- `MONGO_URI=...`
- `DB_NAME=clearmarket`
- `JWT_SECRET=...`
- `EMERGENT_LLM_KEY=...`
- `ALPHA_VANTAGE_KEY=...`
- `CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com`

> Security rule built into backend: in production, `CORS_ORIGINS` cannot contain `*`.

Use `backend/.env.example` as template.

---

## 3) Connect frontend to API

In frontend build step, set:

```bash
REACT_APP_BACKEND_URL=https://api.yourdomain.com
```

Then upload fresh build output to `public_html`.

---

## 4) Keep API safe (must-do checklist)

- ✅ Use HTTPS for both frontend and API
- ✅ Set `APP_ENV=production`
- ✅ Set explicit `CORS_ORIGINS` (no `*`)
- ✅ Use strong `JWT_SECRET`
- ✅ Keep `.env` only on backend host (never in frontend)
- ✅ Do not expose database or provider keys in client code

---

## 5) Optional: host backend on cPanel too (advanced)

If your cPanel supports **Python App (Passenger)**, you can run backend there.
Use:

- `backend/passenger_wsgi.py` as startup file
- entry point `application`

But for simplicity and reliability, frontend-on-cPanel + backend-on-platform is recommended.

---

## 6) Quick verification

- Frontend: `https://yourdomain.com`
- API: `https://api.yourdomain.com/api/health`
- In browser devtools, confirm API calls go to `api.yourdomain.com`

