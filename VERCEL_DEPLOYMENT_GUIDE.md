# Vercel Deployment Guide - Frontend (Next.js)

## Overview

This guide walks you through deploying the Salon Ops Web frontend to Vercel.

## Prerequisites

- ✅ Railway API deployed and running
- ✅ Railway API URL (e.g., `https://your-api.up.railway.app`)
- ✅ GitHub repository connected
- ✅ Vercel account (free tier works)

## Step-by-Step Deployment

### 1. Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New"** → **"Project"**
3. Select **"Import Git Repository"**
4. Choose your GitHub repository
5. Click **"Import"**

### 2. Configure Project Settings

Vercel will auto-detect Next.js, but you need to configure for monorepo:

#### Framework Preset
- **Framework**: Next.js
- **Auto-detected**: ✅ Yes

#### Root Directory
⚠️ **CRITICAL**: Set this to `apps/web`

Click **"Edit"** next to Root Directory and enter:
```
apps/web
```

#### Build & Development Settings

Click **"Override"** and configure:

**Build Command**:
```bash
cd ../.. && pnpm turbo run build --filter=@salon-ops/web
```

**Output Directory**:
```
apps/web/.next
```

**Install Command**:
```bash
pnpm install --frozen-lockfile
```

**Development Command** (optional):
```bash
pnpm dev
```

### 3. Set Environment Variables

Click **"Environment Variables"** and add these:

#### Required Variables

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://your-api.up.railway.app/api/v1` | Production, Preview, Development |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Production |
| `NEXT_PUBLIC_APP_URL` | `https://your-app-git-branch.vercel.app` | Preview |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3001` | Development |

#### Optional Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_ENABLE_REALTIME` | `false` | Enable real-time features (requires Redis) |
| `NEXT_PUBLIC_ENABLE_INVENTORY` | `false` | Enable inventory module |
| `NEXT_PUBLIC_ENABLE_MEMBERSHIPS` | `false` | Enable memberships module |

#### How to Add Variables

1. Click **"Add New"**
2. Enter **Key** (e.g., `NEXT_PUBLIC_API_URL`)
3. Enter **Value** (e.g., `https://your-api.up.railway.app/api/v1`)
4. Select environments: **Production**, **Preview**, **Development**
5. Click **"Add"**
6. Repeat for all variables

### 4. Deploy

1. Click **"Deploy"**
2. Vercel will:
   - Install dependencies with pnpm
   - Build `@salon-ops/shared` package
   - Build Next.js app
   - Deploy to CDN

**Build time**: ~2-3 minutes

### 5. Get Your Vercel URL

After deployment completes:

1. Copy your Vercel URL (e.g., `https://salon-ops.vercel.app`)
2. Update Railway environment variable:
   - Go to Railway Dashboard
   - Select your API service
   - Variables → Edit `APP_URL`
   - Set to your Vercel URL
   - Redeploy Railway API

This ensures CORS works correctly!

## Vercel Configuration Files

### vercel.json (Root Directory)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "cd ../.. && pnpm turbo run build --filter=@salon-ops/web",
  "devCommand": "cd apps/web && pnpm dev",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next"
}
```

This file is optional but helps Vercel auto-detect settings.

### .env.vercel.template

Template for environment variables (copy values to Vercel dashboard).

## Monorepo Build Process

Vercel will execute:

```bash
# 1. Install dependencies (workspace root)
pnpm install --frozen-lockfile

# 2. Build shared package (dependency)
pnpm turbo run build --filter=@salon-ops/shared

# 3. Build web app
pnpm turbo run build --filter=@salon-ops/web

# 4. Deploy .next output to CDN
```

## Environment Variables Explained

### NEXT_PUBLIC_API_URL

**Purpose**: Backend API endpoint

**Format**: `https://your-api.up.railway.app/api/v1`

**Important**: 
- Must include `/api/v1` suffix
- Must be HTTPS in production
- Must match Railway API URL

**Example**:
```bash
# Production
NEXT_PUBLIC_API_URL=https://salon-api-production.up.railway.app/api/v1

# Preview (for testing)
NEXT_PUBLIC_API_URL=https://salon-api-staging.up.railway.app/api/v1
```

### NEXT_PUBLIC_APP_URL

**Purpose**: Frontend URL (for redirects, OAuth callbacks)

**Format**: `https://your-app.vercel.app`

**Important**:
- Different for each environment
- Used by backend for CORS
- Used for OAuth redirects

**Example**:
```bash
# Production
NEXT_PUBLIC_APP_URL=https://salon-ops.vercel.app

# Preview
NEXT_PUBLIC_APP_URL=https://salon-ops-git-feature-branch.vercel.app

# Development
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## Deployment Checklist

### Pre-Deployment
- [ ] Railway API is deployed and running
- [ ] Railway API URL is known
- [ ] GitHub repository is up to date
- [ ] `vercel.json` is in repository root

### Vercel Configuration
- [ ] Project created on Vercel
- [ ] Root directory set to `apps/web`
- [ ] Build command configured for monorepo
- [ ] Output directory set to `apps/web/.next`
- [ ] Install command set to `pnpm install --frozen-lockfile`

### Environment Variables
- [ ] `NEXT_PUBLIC_API_URL` set to Railway URL
- [ ] `NEXT_PUBLIC_APP_URL` set for all environments
- [ ] Feature flags configured
- [ ] All variables applied to correct environments

### Post-Deployment
- [ ] Deployment succeeded
- [ ] Vercel URL copied
- [ ] Railway `APP_URL` updated to Vercel URL
- [ ] Railway API redeployed
- [ ] CORS tested (frontend can call API)
- [ ] Login flow tested

## Testing the Deployment

### 1. Check Build Logs

In Vercel Dashboard → Deployments → Latest → View Function Logs

Look for:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
```

### 2. Test the Application

1. Open your Vercel URL
2. Try to login
3. Check browser console for errors
4. Verify API calls work (Network tab)

### 3. Common Issues

#### CORS Error
```
Access to fetch at 'https://api.railway.app' from origin 'https://app.vercel.app' 
has been blocked by CORS policy
```

**Fix**: Update Railway `APP_URL` to match Vercel URL

#### API Connection Error
```
Failed to fetch
```

**Fix**: Check `NEXT_PUBLIC_API_URL` is correct and Railway API is running

#### Build Error
```
Cannot find module '@salon-ops/shared'
```

**Fix**: Ensure build command includes `turbo run build --filter=@salon-ops/web`

## Automatic Deployments

Vercel automatically deploys:

- **Production**: On push to `main` branch
- **Preview**: On push to any other branch
- **Pull Requests**: On PR creation/update

### Branch Deployments

Each branch gets its own URL:
```
main → https://salon-ops.vercel.app
feature-branch → https://salon-ops-git-feature-branch.vercel.app
```

## Custom Domain (Optional)

### Add Custom Domain

1. Vercel Dashboard → Project → Settings → Domains
2. Click **"Add"**
3. Enter your domain (e.g., `app.yoursalon.com`)
4. Follow DNS configuration instructions
5. Vercel auto-provisions SSL certificate

### Update Environment Variables

After adding custom domain:

1. Update `NEXT_PUBLIC_APP_URL` to custom domain
2. Update Railway `APP_URL` to custom domain
3. Redeploy both services

## Performance Optimization

### Vercel Features (Automatic)

- ✅ Global CDN
- ✅ Edge caching
- ✅ Image optimization
- ✅ Automatic HTTPS
- ✅ Brotli compression
- ✅ HTTP/2 & HTTP/3

### Next.js Optimizations

- ✅ Static page generation
- ✅ Incremental static regeneration
- ✅ Automatic code splitting
- ✅ Tree shaking
- ✅ Font optimization

## Monitoring

### Vercel Analytics

Automatically enabled on Vercel:
- Real User Monitoring (RUM)
- Web Vitals
- Page load times
- Error tracking

Access: Vercel Dashboard → Project → Analytics

### Vercel Logs

Real-time logs:
- Vercel Dashboard → Project → Deployments → Function Logs
- Shows Next.js server logs
- API route errors
- Build errors

## Cost

### Vercel Pricing

**Hobby (Free)**:
- Unlimited deployments
- 100 GB bandwidth/month
- Automatic HTTPS
- Perfect for development/testing

**Pro ($20/month)**:
- Unlimited bandwidth
- Team collaboration
- Password protection
- Analytics
- Required for commercial use

## Troubleshooting

### Build Fails

**Check**:
1. Build logs in Vercel dashboard
2. Root directory is `apps/web`
3. Build command includes monorepo path
4. Dependencies are in `package.json`

### Runtime Errors

**Check**:
1. Environment variables are set
2. API URL is correct
3. Railway API is running
4. CORS is configured

### Slow Builds

**Optimize**:
1. Enable Vercel build cache
2. Use `pnpm` (faster than npm)
3. Minimize dependencies
4. Use `turbo` for caching

## Next Steps

1. ✅ Deploy to Vercel
2. ✅ Update Railway CORS
3. ✅ Test login flow
4. ✅ Add custom domain (optional)
5. ✅ Enable analytics
6. ✅ Set up monitoring

## Support

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- Turbo Docs: https://turbo.build/repo/docs

## Summary

Your frontend is now deployed on Vercel with:
- ✅ Automatic deployments from GitHub
- ✅ Global CDN distribution
- ✅ Automatic HTTPS
- ✅ Preview deployments for branches
- ✅ Connected to Railway API

**Your app is live!** 🎉
