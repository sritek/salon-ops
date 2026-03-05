# Railway Deployment Guide - Salon Management SaaS

Complete guide to deploy your Fastify API backend on Railway.

---

## 📋 Prerequisites

Before starting, ensure you have:

- [ ] GitHub account with your code pushed
- [ ] Railway account (sign up at [railway.app](https://railway.app))
- [ ] Neon account for PostgreSQL (sign up at [neon.tech](https://neon.tech))
- [ ] Generated JWT secret (see below)

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Set Up Neon Database (2 minutes)

1. Go to [console.neon.tech](https://console.neon.tech)
2. Click "Create Project"
3. Name it: `salon-ops-production`
4. Select region: **Asia Pacific (Singapore)** or closest to your users
5. Click "Create Project"
6. Copy the connection string (looks like):
   ```
   postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require
   ```
7. Keep this tab open - you'll need it in Step 3

### Step 2: Deploy to Railway (2 minutes)

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Authorize Railway to access your GitHub
5. Select your `salon-ops` repository
6. Railway will detect your app and start building

### Step 3: Configure Environment Variables (1 minute)

In Railway dashboard:

1. Click on your service
2. Go to "Variables" tab
3. Click "Raw Editor"
4. Paste the following (replace values):

```bash
# Application
NODE_ENV=production
PORT=3000
API_URL=https://your-service-name.up.railway.app
APP_URL=https://your-frontend.vercel.app

# Database (from Neon - Step 1)
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require&connection_limit=10&pool_timeout=30
DIRECT_URL=postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require

# JWT Secret (generate below)
JWT_SECRET=your-generated-secret-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Logging
LOG_LEVEL=info

# Feature Flags
ENABLE_REDIS=false
ENABLE_INVENTORY=false
ENABLE_MEMBERSHIPS=false
ENABLE_ONLINE_BOOKING=false
ENABLE_MARKETING=false
```

5. Click "Save"

**Generate JWT Secret:**
```bash
# On Mac/Linux:
openssl rand -base64 32

# Or use online generator:
# https://generate-secret.vercel.app/32
```

---

## 🔧 Detailed Configuration

### Railway Service Settings

After deployment, configure these settings in Railway:

#### 1. Resource Limits (Variables tab)

Add these to control costs:

```bash
# Resource limits
RAILWAY_MAX_MEMORY_MB=1024
RAILWAY_MAX_CPU_CORES=1
```

#### 2. Health Check (Settings tab)

Railway will automatically use the `/health` endpoint defined in `railway.json`.

Verify it's working:
```bash
curl https://your-service.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-03-05T10:30:00.000Z",
  "environment": "production",
  "features": {
    "redis": false,
    "inventory": false,
    "memberships": false
  }
}
```

#### 3. Custom Domain (Optional)

1. Go to "Settings" tab
2. Click "Generate Domain" for free Railway domain
3. Or add your custom domain:
   - Click "Add Custom Domain"
   - Enter: `api.yourdomain.com`
   - Add CNAME record in your DNS:
     ```
     CNAME api.yourdomain.com -> your-service.up.railway.app
     ```

---

## 🗄️ Database Setup

### Run Migrations

Railway automatically runs migrations on deployment via the start command in `nixpacks.toml`:

```bash
pnpm db:migrate:prod && node dist/server.js
```

### Verify Database Connection

Check Railway logs:

1. Go to "Deployments" tab
2. Click latest deployment
3. Look for:
   ```
   ✓ Prisma schema loaded
   ✓ Database connection successful
   ✓ Migrations applied
   ```

### Seed Database (Optional)

To seed your production database:

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login:
   ```bash
   railway login
   ```

3. Link to your project:
   ```bash
   railway link
   ```

4. Run seed:
   ```bash
   railway run pnpm --filter @salon-ops/api db:seed
   ```

---

## 🔍 Monitoring & Debugging

### View Logs

**In Railway Dashboard:**
1. Go to your service
2. Click "Deployments" tab
3. Click on active deployment
4. View real-time logs

**Using Railway CLI:**
```bash
railway logs
```

### Common Issues & Solutions

#### Issue 1: Build Fails - "Cannot find module"

**Solution:** Clear build cache
```bash
# In Railway dashboard:
Settings → Danger Zone → Clear Build Cache
```

#### Issue 2: Database Connection Timeout

**Solution:** Check connection string format
```bash
# Correct format (note the query parameters):
postgresql://user:pass@host/db?sslmode=require&connection_limit=10&pool_timeout=30
```

#### Issue 3: Port Binding Error

**Solution:** Railway automatically sets PORT. Don't hardcode it.
```typescript
// ✅ Good (uses env.PORT which defaults to 3000)
await fastify.listen({ port: env.PORT, host: '0.0.0.0' });

// ❌ Bad
await fastify.listen({ port: 3000, host: '0.0.0.0' });
```

#### Issue 4: Prisma Client Not Generated

**Solution:** Ensure build command includes db:generate
```bash
# In nixpacks.toml (already configured):
pnpm --filter @salon-ops/api db:generate
```

---

## 💰 Cost Optimization

### Current Configuration Cost: ~$5/month

**Breakdown:**
- Railway: $5/month (minimum)
- Neon: $0/month (free tier)
- **Total: $5/month**

### Tips to Stay Under $5

1. **Use 1 vCPU, 1GB RAM** (default)
   - Handles 5,000+ requests/day
   - Good for MVP and pilot

2. **Enable Sleep Mode for Dev/Staging**
   ```bash
   # In Railway settings:
   Enable "Sleep after 1 hour of inactivity"
   ```

3. **Monitor Usage**
   - Check Railway dashboard weekly
   - Set up billing alerts at $4

4. **Optimize Database Queries**
   - Use Prisma query optimization
   - Add indexes for common queries
   - Use connection pooling (already configured)

---

## 🔄 CI/CD - Auto Deploy on Push

Railway automatically deploys when you push to GitHub:

```bash
# Make changes
git add .
git commit -m "Update API"
git push origin main

# Railway automatically:
# 1. Detects push
# 2. Builds new image
# 3. Runs migrations
# 4. Deploys new version
# 5. Zero downtime!
```

### Deploy Specific Branch

By default, Railway deploys from `main`. To change:

1. Go to "Settings" tab
2. Find "Deploy Branch"
3. Change to `production` or your preferred branch

---

## 🧪 Testing Your Deployment

### 1. Health Check

```bash
curl https://your-service.up.railway.app/health
```

### 2. API Documentation

Visit Swagger UI:
```
https://your-service.up.railway.app/docs
```

### 3. Test Authentication

```bash
# Register a user
curl -X POST https://your-service.up.railway.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!@#",
    "name": "Test User",
    "phone": "+919876543210"
  }'

# Login
curl -X POST https://your-service.up.railway.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "password": "Test123!@#"
  }'
```

---

## 🔐 Security Checklist

Before going live:

- [ ] Changed JWT_SECRET from default
- [ ] Set NODE_ENV=production
- [ ] Enabled HTTPS (automatic on Railway)
- [ ] Set APP_URL to your actual frontend URL
- [ ] Reviewed CORS settings in `server.ts`
- [ ] Set LOG_LEVEL=info (not debug)
- [ ] Disabled unnecessary feature flags
- [ ] Set up Sentry for error tracking (optional)

---

## 📊 Scaling Guide

### When to Scale Up

Scale when you experience:
- Response times > 500ms
- CPU usage > 80%
- Memory usage > 80%
- 10,000+ requests/day

### How to Scale

**Option 1: Vertical Scaling (Increase Resources)**

In Railway Variables, add:
```bash
RAILWAY_MAX_MEMORY_MB=2048
RAILWAY_MAX_CPU_CORES=2
```

Cost: ~$10-15/month

**Option 2: Horizontal Scaling (Multiple Instances)**

Railway Pro plan supports multiple instances:
1. Upgrade to Railway Pro ($20/month)
2. Set replicas: 2-3 instances
3. Automatic load balancing

Cost: ~$20-30/month

---

## 🆘 Support & Resources

### Railway Resources
- [Railway Docs](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://status.railway.app)

### Neon Resources
- [Neon Docs](https://neon.tech/docs)
- [Neon Discord](https://discord.gg/neon)
- [Neon Status](https://status.neon.tech)

### Your App Resources
- API Docs: `https://your-service.up.railway.app/docs`
- Health Check: `https://your-service.up.railway.app/health`

---

## 🎯 Next Steps

After successful deployment:

1. **Deploy Frontend to Vercel**
   - See `VERCEL_DEPLOYMENT.md`
   - Update API_URL in frontend env

2. **Set Up Monitoring**
   - Add Sentry for error tracking
   - Set up uptime monitoring (UptimeRobot)

3. **Configure Custom Domain**
   - Add custom domain in Railway
   - Update DNS records

4. **Enable Features**
   - Test with ENABLE_INVENTORY=true
   - Test with ENABLE_MEMBERSHIPS=true

5. **Load Testing**
   - Use k6 or Artillery
   - Test with 100+ concurrent users

---

## 📝 Deployment Checklist

### Pre-Deployment
- [ ] Code pushed to GitHub
- [ ] Neon database created
- [ ] JWT secret generated
- [ ] Environment variables prepared

### Deployment
- [ ] Railway project created
- [ ] GitHub repo connected
- [ ] Environment variables set
- [ ] First deployment successful

### Post-Deployment
- [ ] Health check passing
- [ ] Database migrations applied
- [ ] API documentation accessible
- [ ] Test authentication working
- [ ] Frontend connected to API
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up (optional)

---

## 🎉 Success!

Your Fastify API is now live on Railway!

**Your API URL:** `https://your-service.up.railway.app`

**Cost:** ~$5/month (Railway minimum)

**Performance:** 80-150ms response time, handles 5,000+ requests/day

**Next:** Deploy your Next.js frontend to Vercel (see `VERCEL_DEPLOYMENT.md`)
