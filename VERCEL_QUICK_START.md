# Vercel Quick Start - 5 Minutes

## Before You Start

Get your Railway API URL:
```
https://your-api-service.up.railway.app
```

## Step 1: Test Build Locally (Optional but Recommended)

```bash
# Build shared package
pnpm turbo run build --filter=@salon-ops/shared

# Build web app
pnpm turbo run build --filter=@salon-ops/web
```

If this succeeds, Vercel will succeed too!

## Step 2: Push to GitHub

```bash
git add vercel.json .env.vercel.template
git commit -m "feat: add Vercel configuration"
git push origin railway-deployment
```

## Step 3: Deploy on Vercel

### 3.1 Create Project
1. Go to https://vercel.com
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repo

### 3.2 Configure (IMPORTANT!)

**Root Directory**: `apps/web` ⚠️

**Build Command**:
```bash
cd ../.. && pnpm turbo run build --filter=@salon-ops/web
```

**Output Directory**: `apps/web/.next`

**Install Command**: `pnpm install --frozen-lockfile`

### 3.3 Add Environment Variables

Click **"Environment Variables"** and add:

```bash
# Required
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app/api/v1
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Optional (for pilot)
NEXT_PUBLIC_ENABLE_REALTIME=false
NEXT_PUBLIC_ENABLE_INVENTORY=false
NEXT_PUBLIC_ENABLE_MEMBERSHIPS=false
```

**Important**: Replace `your-api.up.railway.app` with your actual Railway URL!

### 3.4 Deploy

Click **"Deploy"** and wait ~2-3 minutes.

## Step 4: Update Railway CORS

After Vercel deployment:

1. Copy your Vercel URL (e.g., `https://salon-ops.vercel.app`)
2. Go to Railway Dashboard
3. Select your API service
4. Variables → Edit `APP_URL`
5. Change to: `https://salon-ops.vercel.app`
6. Click **"Redeploy"**

This fixes CORS so frontend can call API!

## Step 5: Test

1. Open your Vercel URL
2. Try to login
3. Check if API calls work

## Done! 🎉

Your app is now live on:
- **Frontend**: https://your-app.vercel.app
- **Backend**: https://your-api.up.railway.app

## Troubleshooting

### Build Fails
- Check root directory is `apps/web`
- Check build command includes `cd ../..`

### CORS Error
- Update Railway `APP_URL` to Vercel URL
- Redeploy Railway API

### API Not Found
- Check `NEXT_PUBLIC_API_URL` includes `/api/v1`
- Check Railway API is running

## Full Guide

See `VERCEL_DEPLOYMENT_GUIDE.md` for detailed instructions.
