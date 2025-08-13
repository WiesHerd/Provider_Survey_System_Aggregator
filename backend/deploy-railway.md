# 🚀 Railway Backend Deployment Guide

## Quick Setup (5 minutes)

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Login to Railway
```bash
railway login
```

### Step 3: Deploy Backend
```bash
cd backend
railway init
railway up
```

### Step 4: Get Your Backend URL
```bash
railway domain
```

### Step 5: Update Frontend Environment
Set the environment variable in your frontend:
```
REACT_APP_API_URL=https://your-railway-app.railway.app
```

## Alternative: Render.com (Also Free)

1. Go to https://render.com
2. Connect your GitHub repository
3. Create a new Web Service
4. Set build command: `npm install`
5. Set start command: `npm start`
6. Deploy!

## Environment Variables to Set

In Railway/Render dashboard, set these environment variables:
- `NODE_ENV=production`
- `PORT=10000` (or let the platform set it)

## Your Backend Will Be Available At:
- Railway: `https://your-app-name.railway.app`
- Render: `https://your-app-name.onrender.com`

## Test Your Backend
```bash
curl https://your-backend-url/api/health
```

Should return: `{"status":"OK","timestamp":"..."}`
