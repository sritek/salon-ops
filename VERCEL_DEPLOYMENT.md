# Vercel Deployment Guide - Next.js Frontend

Complete guide to deploy your Next.js admin dashboard on Vercel.

---

## 📋 Prerequisites

- [ ] Railway API deployed and running
- [ ] Vercel account (sign up at [vercel.com](https://vercel.com))
- [ ] GitHub repository with your code

---

## 🚀 Quick Start (3 Minutes)

### Step 1: Deploy to Vercel (1 minute)

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Vercel auto-detects Next.js configuration
5. Click "Deploy"

### Step 2: Configure Environment Variables (2 minutes)

In Vercel dashboard:

1. Go to your project
2. Click "Settings" → "Environment Variables"
3. Add these variables:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://your-service.up.railway.app

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

4. Click "Save"
5. Redeploy: "Deployments" → "..." → "Redeploy"

---

## 🔧 Detailed Configuration

### Project Settings

Vercel auto-detects these from your `apps/web/package.json`:

- **Framework Preset:** Next.js
- **Root Directory:** `apps/web`
- **Build Command:** `cd ../.. && pnpm install && pnpm --filter @salon-ops/web build`
- **Output Directory:** `.next`
- **Install Command:** `pnpm install`

### Environment Variables

#### Production Variables

```bash
# API
NEXT_PUBLIC_API_URL=https://your-api.railway.app

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Optional: Analytics
# NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

#### Preview/Development Variables

Same as production, but use preview URLs:

```bash
NEXT_PUBLIC_API_URL=https://your-api-staging.railway.app
NEXT_PUBLIC_APP_URL=https://your-app-git-develop.vercel.app
```

---

## 🔄 Auto Deployments

Vercel automatically deploys:

- **Production:** Pushes to `main` branch
- **Preview:** Pushes to any other branch
- **Pull Requests:** Each PR gets a unique preview URL

### Deployment Flow

```bash
# Make changes
git checkout -b feature/new-feature
git add .
git commit -m "Add new feature"
git push origin feature/new-feature

# Vercel automatically:
# 1. Detects push
# 2. Builds preview
# 3. Deploys to preview URL
# 4. Comments on PR with preview link
```

---

## 🎯 Custom Domain Setup

### Add Custom Domain

1. Go to "Settings" → "Domains"
2. Click "Add"
3. Enter your domain: `app.yourdomain.com`
4. Vercel provides DNS instructions

### DNS Configuration

Add these records to your DNS provider:

**Option 1: CNAME (Recommended)**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

**Option 2: A Record**
```
Type: A
Name: app
Value: 76.76.21.21
```

### SSL Certificate

Vercel automatically provisions SSL certificates (Let's Encrypt).

---

## 🧪 Testing Your Deployment

### 1. Visit Your App

```
https://your-app.vercel.app
```

### 2. Test Login

1. Navigate to login page
2. Enter credentials
3. Verify API connection works

### 3. Check Console

Open browser DevTools:
- No CORS errors
- API calls successful
- No 404 errors

---

## 💰 Cost

### Vercel Pricing

**Hobby (Free):**
- Unlimited deployments
- 100GB bandwidth/month
- Automatic HTTPS
- Preview deployments
- **Perfect for MVP!**

**Pro ($20/month):**
- 1TB bandwidth
- Advanced analytics
- Password protection
- Team collaboration

**Start with Free, upgrade when needed.**

---

## 🔍 Monitoring

### Vercel Analytics

Enable in dashboard:
1. Go to "Analytics" tab
2. Click "Enable Analytics"
3. View real-time metrics

### Performance Monitoring

Vercel provides:
- Page load times
- Core Web Vitals
- Real User Monitoring (RUM)

---

## 🔐 Security

### Environment Variables

- Never commit `.env` files
- Use Vercel dashboard for secrets
- Different values for preview/production

### CORS Configuration

Ensure your Railway API allows your Vercel domain:

```typescript
// apps/api/src/server.ts
await fastify.register(cors, {
  origin: [
    'https://your-app.vercel.app',
    'https://your-app-git-*.vercel.app', // Preview deployments
  ],
  credentials: true,
});
```

---

## 📊 Performance Optimization

### Image Optimization

Next.js automatically optimizes images:

```tsx
import Image from 'next/image';

<Image
  src="/logo.png"
  width={200}
  height={50}
  alt="Logo"
/>
```

### Font Optimization

Already configured in your app:

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
```

### Bundle Analysis

Check bundle size:

```bash
cd apps/web
pnpm build
# Check .next/analyze/
```

---

## 🆘 Troubleshooting

### Issue 1: Build Fails - "Cannot find module"

**Solution:** Check root directory setting

1. Go to "Settings" → "General"
2. Set "Root Directory" to `apps/web`
3. Redeploy

### Issue 2: API Calls Fail - CORS Error

**Solution:** Update Railway CORS settings

```typescript
// In Railway, update APP_URL env var:
APP_URL=https://your-app.vercel.app
```

### Issue 3: Environment Variables Not Working

**Solution:** Redeploy after adding variables

1. Add/update variables
2. Go to "Deployments"
3. Click "..." → "Redeploy"

### Issue 4: 404 on Refresh

**Solution:** Already handled by Next.js App Router

If using custom server, ensure rewrites are configured.

---

## 🎯 Next Steps

1. **Test Full Flow**
   - Register user
   - Login
   - Create appointment
   - Verify all features work

2. **Set Up Custom Domain**
   - Purchase domain
   - Configure DNS
   - Add to Vercel

3. **Enable Analytics**
   - Vercel Analytics
   - Google Analytics (optional)

4. **Performance Testing**
   - Lighthouse audit
   - WebPageTest
   - GTmetrix

---

## 📝 Deployment Checklist

### Pre-Deployment
- [ ] Railway API deployed and tested
- [ ] Environment variables prepared
- [ ] Code pushed to GitHub

### Deployment
- [ ] Vercel project created
- [ ] GitHub repo connected
- [ ] Environment variables set
- [ ] First deployment successful

### Post-Deployment
- [ ] App loads successfully
- [ ] Login works
- [ ] API calls successful
- [ ] No console errors
- [ ] Custom domain configured (optional)

---

## 🎉 Success!

Your Next.js frontend is now live on Vercel!

**Your App URL:** `https://your-app.vercel.app`

**Cost:** $0/month (Free tier)

**Performance:** 1-2 second page loads, edge-optimized

**Complete Stack:**
- Frontend: Vercel (Free)
- Backend: Railway ($5/month)
- Database: Neon (Free)
- **Total: $5/month**
