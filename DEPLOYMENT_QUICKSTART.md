# 🚀 Deployment Quick Start

Deploy your Salon Management SaaS in 15 minutes.

---

## Step 1: Database (3 min)

1. Go to [neon.tech](https://neon.tech) → Create Project
2. Name: `salon-ops-production`
3. Region: Asia Pacific (Singapore)
4. Copy connection string
5. Enable connection pooling

---

## Step 2: Backend (5 min)

1. Go to [railway.app](https://railway.app) → New Project
2. Deploy from GitHub → Select your repo
3. Add environment variables:

```bash
NODE_ENV=production
PORT=3000
API_URL=https://your-service.up.railway.app
APP_URL=https://your-app.vercel.app
DATABASE_URL=<from-step-1>
DIRECT_URL=<from-step-1>
JWT_SECRET=<generate-below>
LOG_LEVEL=info
ENABLE_REDIS=false
ENABLE_INVENTORY=false
ENABLE_MEMBERSHIPS=false
```

4. Generate JWT secret:
```bash
pnpm generate-jwt
```

5. Get Railway URL from Settings → Generate Domain

---

## Step 3: Frontend (5 min)

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import from GitHub → Select your repo
3. Add environment variables:

```bash
NEXT_PUBLIC_API_URL=https://your-service.up.railway.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

4. Deploy
5. Get Vercel URL after deployment

---

## Step 4: Update URLs (2 min)

1. Update Railway `APP_URL` with your Vercel URL
2. Update Vercel `NEXT_PUBLIC_APP_URL` with your Vercel URL
3. Both will auto-redeploy

---

## ✅ Verify

```bash
# Test backend
curl https://your-service.up.railway.app/health

# Test frontend
open https://your-app.vercel.app
```

---

## 📚 Full Guides

- [Complete Deployment Guide](./DEPLOYMENT.md)
- [Railway Detailed Guide](./RAILWAY_DEPLOYMENT.md)
- [Vercel Detailed Guide](./VERCEL_DEPLOYMENT.md)

---

## 💰 Cost

- **Month 1-3:** $5/month (Railway only)
- **Month 4-6:** $24/month (add Neon Pro)
- **Month 7-12:** $44/month (scale up)

---

## 🆘 Issues?

**Build fails:** Check logs in Railway/Vercel dashboard

**Database connection fails:** Verify connection string includes `?sslmode=require`

**CORS errors:** Ensure APP_URL matches your Vercel URL

**More help:** See [DEPLOYMENT.md](./DEPLOYMENT.md) troubleshooting section

---

## 🎉 Done!

Your app is live:
- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-service.up.railway.app`
- API Docs: `https://your-service.up.railway.app/docs`

Cost: $5/month | Performance: 80-150ms | Capacity: 5,000+ req/day
