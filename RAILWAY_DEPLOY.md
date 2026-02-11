# ClearMarket - Railway Deployment Guide

## Prerequisites
- Railway account (https://railway.app)
- MongoDB Atlas account (https://mongodb.com/atlas)
- GitHub account (to push code)

---

## Step 1: Push Code to GitHub

1. Click "Save to GitHub" in Emergent
2. Create a new repository named `clearmarket`
3. Push all code

---

## Step 2: Set Up MongoDB Atlas

1. Create free cluster at MongoDB Atlas
2. Create database user with password
3. Whitelist all IPs: `0.0.0.0/0` (for Railway)
4. Get connection string:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/clearmarket
   ```

---

## Step 3: Deploy Backend on Railway

1. Go to Railway Dashboard → New Project → Deploy from GitHub repo
2. Select your `clearmarket` repo
3. Set **Root Directory**: `/backend`
4. Add Environment Variables:

   | Variable | Value |
   |----------|-------|
   | `MONGO_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/clearmarket` |
   | `DB_NAME` | `clearmarket` |
   | `EMERGENT_LLM_KEY` | `your_gemini_api_key` |
   | `JWT_SECRET` | `your_random_secret_key_here` |
   | `ALPHA_VANTAGE_KEY` | `your_alpha_vantage_key` (or `demo`) |
   | `CORS_ORIGINS` | `*` (update after frontend deploy) |
   | `PORT` | `8001` |

5. Deploy and get backend URL (e.g., `https://clearmarket-backend.up.railway.app`)

---

## Step 4: Deploy Frontend on Railway

1. Create another service in same project → Deploy from GitHub
2. Select your `clearmarket` repo
3. Set **Root Directory**: `/frontend`
4. Add Environment Variables:

   | Variable | Value |
   |----------|-------|
   | `REACT_APP_BACKEND_URL` | `https://your-backend.up.railway.app` |

5. Add Build Argument (in Settings → Build):
   ```
   REACT_APP_BACKEND_URL=https://your-backend.up.railway.app
   ```

6. Deploy and get frontend URL

---

## Step 5: Update CORS (Important!)

Go back to Backend service and update:
```
CORS_ORIGINS=https://your-frontend.up.railway.app
```

---

## Step 6: Set Up Custom Domain (Optional)

1. In Railway, go to service Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

---

## Folder Structure for Railway

```
clearmarket/
├── backend/
│   ├── Dockerfile        ← Backend container
│   ├── railway.toml      ← Railway config
│   ├── requirements.txt
│   ├── server.py
│   └── .env.example
├── frontend/
│   ├── Dockerfile        ← Frontend container
│   ├── railway.toml      ← Railway config
│   ├── nginx.conf        ← Nginx for SPA routing
│   ├── package.json
│   └── src/
└── RAILWAY_DEPLOY.md     ← This file
```

---

## Troubleshooting

### Backend not starting?
- Check logs in Railway dashboard
- Verify MONGO_URI is correct
- Ensure all env variables are set

### Frontend shows blank page?
- Check REACT_APP_BACKEND_URL is correct
- Verify backend CORS_ORIGINS includes frontend URL

### API calls failing?
- Check browser console for CORS errors
- Verify backend is running (visit `/api/health`)

---

## Cost Estimate (Railway)

- **Hobby Plan**: $5/month (includes $5 credits)
- **Backend**: ~$2-3/month
- **Frontend**: ~$1-2/month
- **MongoDB Atlas**: Free tier available

---

## Need Help?

- Railway Docs: https://docs.railway.app
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com
