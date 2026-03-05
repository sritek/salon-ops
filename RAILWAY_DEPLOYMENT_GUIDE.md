# Railway Deployment Guide

## Overview

This guide explains how to deploy the Salon Ops API to Railway and the Web app to Vercel.

## Architecture

- **Railway**: Hosts the Fastify API (`apps/api`)
- **Vercel**: Hosts the Next.js Web app (`apps/web`)
- **Neon**: PostgreSQL database (external)
- **Redis**: Optional (disabled for pilot deployment)
- **BullMQ**: Optional (disabled for pilot deployment)

## Why Docker on Railway?

Railway uses **Nixpacks** which automatically generates a Dockerfile. You cannot avoid Docker on Railway - it's their deployment mechanism. However, the `nixpacks.toml` configuration makes this transparent to you.

## Build Fix Applied

### Problem
The build was failing because `@salon-ops/shared` (a workspace package) wasn't being built before `@salon-ops/api`.

### Solution
Updated `nixpacks.toml` to build dependencies in order:

```toml
[phases.build]
cmds = [
  "pnpm install --frozen-lockfile",
  "pnpm turbo run build --filter=@salon-ops/shared",
  "pnpm turbo run build --filter=@salon-ops/api"
]
```

## Railway Setup

### 1. Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will auto-detect `nixpacks.toml`

### 2. Add PostgreSQL Database

**Option A: Use Neon (Recommended)**
- Create database at [neon.tech](https://neon.tech)
- Copy the **POOLED** connection string
- Add to Railway environment variables

**Option B: Use Railway PostgreSQL**
- Click "New" → "Database" → "PostgreSQL"
- Railway will auto-generate `DATABASE_URL`

### 3. Set Environment Variables

Go to Railway Dashboard → Your Service → Variables → Raw Editor

Copy from `.env.railway.template` and fill in:

```bash
# Application
NODE_ENV=production
PORT=3000
API_URL=https://your-service.up.railway.app
APP_URL=https://your-app.vercel.app

# Database (from Neon or Railway)
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=your-secure-random-string-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Logging
LOG_LEVEL=info

# Feature Flags (Redis disabled for pilot)
ENABLE_REDIS=false
ENABLE_INVENTORY=false
ENABLE_MEMBERSHIPS=false
ENABLE_ONLINE_BOOKING=false
ENABLE_MARKETING=false
```

### 4. Run Database Migrations

After first deployment, run migrations:

```bash
# From Railway dashboard → Service → Settings → Deploy
# Or use Railway CLI:
railway run pnpm --filter api db:migrate:prod
```

### 5. Deploy

Push to GitHub - Railway will auto-deploy on every push to main branch.

## Vercel Setup

### 1. Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web` ⚠️ Important!
   - **Build Command**: `cd ../.. && pnpm turbo run build --filter=@salon-ops/web`
   - **Output Directory**: `apps/web/.next`
   - **Install Command**: `pnpm install`

### 2. Set Environment Variables

Add in Vercel Dashboard → Project → Settings → Environment Variables:

```bash
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
NODE_ENV=production
```

### 3. Deploy

Vercel will auto-deploy on every push to main branch.

## CORS Configuration

After deploying both services, update Railway environment variable:

```bash
APP_URL=https://your-actual-app.vercel.app
```

This ensures the API accepts requests from your Vercel frontend.

## Redis & BullMQ (Optional)

Your app is already configured to work **without** Redis and BullMQ:

- `ENABLE_REDIS=false` - All Redis operations become no-ops
- BullMQ is not used when Redis is disabled
- Real-time features will use polling instead of pub/sub

### To Enable Redis Later

1. Add Redis service in Railway:
   - Click "New" → "Database" → "Redis"
   - Railway will generate `REDIS_URL`

2. Update environment variable:
   ```bash
   ENABLE_REDIS=true
   REDIS_URL=redis://default:password@redis.railway.internal:6379
   ```

3. Redeploy

## Deployment Checklist

### Railway (API)
- [ ] Repository connected
- [ ] `nixpacks.toml` detected
- [ ] PostgreSQL database added (Neon or Railway)
- [ ] Environment variables set from `.env.railway.template`
- [ ] `JWT_SECRET` generated (min 32 chars)
- [ ] Database migrations run
- [ ] API accessible at Railway URL

### Vercel (Web)
- [ ] Repository connected
- [ ] Root directory set to `apps/web`
- [ ] Build command configured for monorepo
- [ ] `NEXT_PUBLIC_API_URL` set to Railway URL
- [ ] Web app accessible at Vercel URL

### Final Steps
- [ ] Update Railway `APP_URL` to Vercel URL
- [ ] Test API from Vercel frontend
- [ ] Verify CORS working
- [ ] Test authentication flow

## Troubleshooting

### Build fails with "Cannot find module '@salon-ops/shared'"
✅ Fixed - `nixpacks.toml` now builds shared package first

### CORS errors in browser
- Check `APP_URL` in Railway matches your Vercel URL
- Ensure no trailing slash in URLs

### Database connection errors
- Verify `DATABASE_URL` is correct
- For Neon, use **POOLED** connection string
- Check connection limits in Neon dashboard

### Redis errors
- Set `ENABLE_REDIS=false` to disable Redis
- App works fine without Redis for pilot deployment

## Monitoring

### Railway Logs
- Dashboard → Service → Deployments → View Logs
- Real-time logs during deployment and runtime

### Vercel Logs
- Dashboard → Project → Deployments → Function Logs
- Real-time logs for API routes and SSR

## Cost Optimization

### Railway
- Hobby Plan: $5/month (includes $5 credit)
- Shared PostgreSQL: ~$5/month
- Total: ~$5/month (first month free with credit)

### Vercel
- Hobby Plan: Free for personal projects
- Pro Plan: $20/month for commercial use

### Neon (if used)
- Free tier: 0.5 GB storage, 3 projects
- Paid: $19/month for 10 GB

## Next Steps

1. Deploy API to Railway
2. Deploy Web to Vercel
3. Run database migrations
4. Test the application
5. Set up custom domain (optional)
6. Enable Redis when needed (optional)

## Support

- Railway Docs: https://docs.railway.app
- Vercel Docs: https://vercel.com/docs
- Neon Docs: https://neon.tech/docs
