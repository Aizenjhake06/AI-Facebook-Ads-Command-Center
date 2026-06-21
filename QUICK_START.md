# 🚀 QUICK START GUIDE

Get your AI Facebook Ads Command Center running in 15 minutes!

---

## ⚡ SUPER QUICK START (2 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
copy .env.example .env.local

# 3. Edit .env.local with your Supabase credentials

# 4. Validate setup
npm run setup

# 5. Run database migration in Supabase SQL Editor
# File: supabase/migrations/00_complete_schema.sql

# 6. Start development server
npm run dev

# 7. Open browser
# http://localhost:3000
```

---

## 📋 DETAILED SETUP (15 minutes)

### Step 1: Prerequisites
- ✅ Node.js 18+ installed
- ✅ npm or yarn installed
- ✅ Supabase account created
- ✅ Meta/Facebook Developer account (for OAuth)

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment
```bash
# Copy template
copy .env.example .env.local

# Edit .env.local and add:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional but recommended for full features:
REDIS_HOST=localhost  # Or use Upstash
REDIS_PORT=6379
```

### Step 4: Setup Database
1. Go to Supabase SQL Editor
2. Copy content from `supabase/migrations/00_complete_schema.sql`
3. Paste and execute
4. Verify 21 tables created

### Step 5: Configure Meta/Facebook App
1. Go to https://developers.facebook.com/
2. Create new app → Business type
3. Add Facebook Login product
4. Configure OAuth redirect: `http://localhost:3000/api/meta/callback`
5. Add to `.env.local`:
   ```
   FACEBOOK_APP_ID=your-app-id
   FACEBOOK_APP_SECRET=your-app-secret
   ```

### Step 6: Validate Setup
```bash
npm run setup
```

Expected output:
```
✅ Node.js Version: Node.js v18.x.x (OK)
✅ Environment File: .env.local found
✅ Supabase URL: Supabase URL configured
✅ Dependencies: Dependencies installed
✅ Setup validation PASSED
```

### Step 7: Start Development Server
```bash
npm run dev
```

Open http://localhost:3000 in your browser!

---

## 🐳 DOCKER QUICK START

### Option A: Development with Docker Compose
```bash
# 1. Configure .env.local (same as above)

# 2. Start all services
docker-compose -f docker-compose.dev.yml up

# Services started:
# - App: http://localhost:3000
# - Redis: localhost:6379
# - Workers: sync, alerts, reports
```

### Option B: Production with Docker
```bash
# 1. Build image
docker build -t adpilot-ai:latest .

# 2. Run container
docker run -d -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  --name adpilot \
  adpilot-ai:latest

# 3. Check health
curl http://localhost:3000/api/health
```

---

## 🧪 TESTING QUICK START

```bash
# Run all tests
npm test

# Watch mode (for development)
npm run test:watch

# With coverage
npm run test:coverage

# Run specific test
npm test health-score

# Validate everything (lint + test + build)
npm run validate
```

---

## 🔧 TROUBLESHOOTING

### Issue: "Supabase connection failed"
**Solution:**
1. Check `.env.local` has correct Supabase URL & keys
2. Verify Supabase project is active
3. Check RLS policies are enabled

### Issue: "Redis connection failed"
**Solution:**
1. For local development: Start Redis with Docker
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   ```
2. Or use Upstash Redis (cloud)
3. Or disable Redis (will use in-memory fallback)

### Issue: "Workers not starting"
**Solution:**
1. Ensure Redis is running
2. Check worker logs: `npm run worker:sync`
3. Verify dependencies installed: `npm install`

### Issue: "Migration failed"
**Solution:**
1. Check Supabase SQL Editor for errors
2. Verify all functions created
3. Run migrations one section at a time
4. Check RLS policies enabled

### Issue: "OAuth redirect mismatch"
**Solution:**
1. Check Meta Developer Console → App Settings → Facebook Login
2. Add redirect URI: `http://localhost:3000/api/meta/callback`
3. For production: `https://yourdomain.com/api/meta/callback`

---

## 📚 COMMON COMMANDS

### Development
```bash
npm run dev              # Start dev server
npm run setup            # Validate environment
npm run lint             # Run linter
npm run build            # Build for production
```

### Testing
```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
npm run validate         # Lint + test + build
```

### Workers (Background Jobs)
```bash
npm run worker:sync      # Start sync worker
npm run worker:alerts    # Start alert worker
npm run worker:reports   # Start report worker
npm run worker:all       # Start all workers
```

### Docker
```bash
# Development
docker-compose -f docker-compose.dev.yml up
docker-compose -f docker-compose.dev.yml down

# Production
docker-compose up
docker-compose down

# View logs
docker-compose logs -f app
docker-compose logs -f worker-sync
```

---

## 🌐 IMPORTANT URLS

After starting the app:

| Service | URL | Description |
|---------|-----|-------------|
| **App** | http://localhost:3000 | Main application |
| **Health** | http://localhost:3000/api/health | Health check |
| **Status** | http://localhost:3000/api/status | System status |
| **Metrics** | http://localhost:3000/api/metrics | Metrics (JSON) |
| **Metrics** | http://localhost:3000/api/metrics?format=prometheus | Metrics (Prometheus) |
| **Supabase** | https://app.supabase.com | Database dashboard |
| **Meta Dev** | https://developers.facebook.com | App configuration |

---

## 📖 NEXT STEPS

Once everything is running:

1. **Register Account**
   - Go to http://localhost:3000/register
   - Create your account

2. **Create Workspace**
   - Create your first workspace
   - Invite team members (optional)

3. **Connect Meta Account**
   - Go to Settings → Ad Accounts
   - Click "Connect Account"
   - Authorize Facebook access
   - Wait for initial sync (~2-5 minutes)

4. **Explore Features**
   - View campaigns dashboard
   - Check recommendations
   - Generate forecasts
   - Create reports

5. **Monitor System**
   - Check /api/health for system health
   - Check /api/status for detailed stats
   - View /api/metrics for performance metrics

---

## 🆘 NEED HELP?

### Documentation
- 📄 [Full System Audit](./SYSTEM_AUDIT.md)
- 📄 [Production Checklist](./PROD_CHECKLIST.md)
- 📄 [Production Setup Guide](./PRODUCTION_SETUP.md)
- 📄 [Implementation Summary](./IMPLEMENTATION_SUMMARY.md)
- 📄 [API Documentation](./API_DOCUMENTATION.md)

### Common Issues
- Check logs: `docker-compose logs -f app`
- Check worker logs: `docker-compose logs -f worker-sync`
- Run validation: `npm run setup`
- Check health: `curl http://localhost:3000/api/health`

---

**🎉 You're all set! Happy developing!**

*Estimated setup time: 15 minutes*  
*Estimated time to first sync: 20 minutes*
