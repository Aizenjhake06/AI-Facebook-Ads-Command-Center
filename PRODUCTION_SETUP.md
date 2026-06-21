# 🚀 PRODUCTION SETUP GUIDE

Complete guide for deploying AI Facebook Ads Command Center to production.

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. Environment Setup
- [ ] Copy `.env.example` to `.env.local` (development) or configure environment variables in hosting platform
- [ ] Set all required Supabase credentials
- [ ] Configure Redis (Upstash recommended)
- [ ] Set up Meta/Facebook App credentials
- [ ] Configure error tracking (Sentry, optional)
- [ ] Set up email service (SMTP, optional)

### 2. Database Setup
- [ ] Run migration: `00_complete_schema.sql` in Supabase SQL Editor
- [ ] Verify all 21 tables created
- [ ] Verify all RLS policies enabled
- [ ] Test database connectivity

### 3. Dependencies & Build
```bash
npm install
npm run setup          # Validate environment
npm run test           # Run all tests
npm run build          # Build for production
```

### 4. Background Workers (Production)
```bash
# Start background job workers
npm run worker:sync    # Meta API sync worker
npm run worker:alerts  # Alert scanning worker
npm run worker:reports # Report generation worker

# Or start all workers at once
npm run worker:all
```

---

## 🏗️ DEPLOYMENT OPTIONS

### Option 1: Netlify

1. **Connect Repository**
   - Go to Netlify dashboard
   - Click "Add new site" → "Import an existing project"
   - Connect to your Git repository

2. **Configure Build Settings**
   ```
   Build command: npm run build
   Publish directory: .next
   ```

3. **Set Environment Variables**
   - Go to Site settings → Build & deploy → Environment
   - Add all variables from `.env.example`

4. **Deploy**
   - Push to main branch
   - Netlify auto-deploys

### Option 2: Vercel

1. **Import Project**
   ```bash
   npm i -g vercel
   vercel
   ```

2. **Configure**
   - Framework: Next.js
   - Root directory: ./
   - Build command: next build
   - Output directory: .next

3. **Set Environment Variables**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   # Add all required variables
   ```

4. **Deploy**
   ```bash
   vercel --prod
   ```

### Option 3: Docker (Self-hosted)

1. **Build Docker Image**
   ```bash
   docker build -t adpilot-ai:latest .
   ```

2. **Run Container**
   ```bash
   docker run -d \
     -p 3000:3000 \
     -e NEXT_PUBLIC_SUPABASE_URL=... \
     -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
     --name adpilot-ai \
     adpilot-ai:latest
   ```

3. **Docker Compose** (Recommended)
   ```yaml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       env_file:
         - .env.production
       depends_on:
         - redis
     
     redis:
       image: redis:7-alpine
       ports:
         - "6379:6379"
     
     worker-sync:
       build: .
       command: npm run worker:sync
       env_file:
         - .env.production
       depends_on:
         - redis
   ```

   Run with:
   ```bash
   docker-compose up -d
   ```

---

## 🔒 SECURITY HARDENING

### 1. SSL/TLS Configuration
- [ ] Obtain SSL certificate (Let's Encrypt recommended)
- [ ] Enforce HTTPS only (no HTTP fallback)
- [ ] Configure HSTS header

### 2. Environment Variables
- [ ] Never commit `.env` files to Git
- [ ] Use secrets management (Vercel Secrets, AWS Secrets Manager, etc.)
- [ ] Rotate secrets quarterly

### 3. Rate Limiting
- [ ] Verify Redis connection for distributed rate limiting
- [ ] Test rate limits (100 req/min per IP)
- [ ] Monitor for abuse

### 4. Database Security
- [ ] Verify RLS policies active on all tables
- [ ] Test RLS with different user roles
- [ ] Enable Supabase audit logging
- [ ] Set up automated backups (daily minimum)

### 5. API Security
- [ ] Verify all API routes require authentication
- [ ] Test workspace isolation
- [ ] Implement CORS restrictions
- [ ] Add CSP headers

---

## 📊 MONITORING SETUP

### 1. Error Tracking (Sentry)
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Configure in `.env`:
```
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-org
SENTRY_PROJECT=adpilot-ai
```

### 2. Application Monitoring
- [ ] Set up health check monitoring (UptimeRobot, Pingdom)
- [ ] Configure health endpoint alerts
- [ ] Set up log aggregation (Datadog, LogRocket)

### 3. Database Monitoring
- [ ] Enable Supabase monitoring dashboard
- [ ] Set up slow query alerts
- [ ] Monitor connection pool usage

### 4. Job Queue Monitoring
- [ ] Install Bull Board for queue visualization
  ```bash
  npm install bull-board
  ```
- [ ] Monitor job success/failure rates
- [ ] Alert on queue depth > 1000

---

## 🧪 POST-DEPLOYMENT VALIDATION

### 1. Smoke Tests
```bash
# Health check
curl https://yourdomain.com/api/health

# Expected response:
# {"status":"healthy","checks":{...}}
```

### 2. Feature Tests
- [ ] Register new user
- [ ] Create workspace
- [ ] Connect Meta account (OAuth flow)
- [ ] Trigger manual sync
- [ ] View campaigns
- [ ] Generate recommendation
- [ ] Create forecast
- [ ] Generate report

### 3. Performance Tests
- [ ] Dashboard load time < 2s
- [ ] API p99 latency < 500ms
- [ ] Sync completes within expected time
- [ ] Report generation < 30s

### 4. Security Tests
- [ ] Attempt unauthorized workspace access (should fail)
- [ ] Test RLS with viewer role (should be read-only)
- [ ] Verify tokens not exposed in logs
- [ ] Test rate limiting

---

## 🔄 SCHEDULED JOBS

Set up cron jobs or scheduled tasks:

### Option 1: Vercel Cron
Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-insights",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/scan-alerts",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/regenerate-forecasts",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Option 2: GitHub Actions
```yaml
name: Scheduled Sync
on:
  schedule:
    - cron: '0 */6 * * *'
jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Sync
        run: |
          curl -X POST https://yourdomain.com/api/cron/sync-insights \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Option 3: External Service (EasyCron, cron-job.org)
- Set up HTTP requests to cron endpoints
- Use secret token for authentication

---

## 📈 SCALING CONSIDERATIONS

### Horizontal Scaling
- ✅ Stateless API (ready for horizontal scaling)
- ✅ Shared Redis for rate limiting
- ✅ Supabase for shared database
- ⚠️ Background workers need coordination (use Bull with Redis)

### Vertical Scaling
- Monitor memory usage (threshold: 512MB)
- Monitor CPU usage (threshold: 80%)
- Scale up if consistently hitting limits

### Database Scaling
- Monitor connection pool (Supabase limit: 60 connections)
- Enable connection pooling (PgBouncer)
- Consider read replicas for analytics queries

---

## 🆘 TROUBLESHOOTING

### Issue: Sync Fails
1. Check Meta API credentials
2. Verify token not expired
3. Check rate limits in sync logs
4. Review error logs in `meta_sync_logs` table

### Issue: High Memory Usage
1. Check for memory leaks (use heap snapshots)
2. Reduce query result sizes
3. Implement pagination
4. Clear old data from insights table

### Issue: Slow Dashboard
1. Enable Redis caching
2. Optimize database queries (use EXPLAIN ANALYZE)
3. Add missing indexes
4. Implement query result caching

### Issue: Workers Not Processing
1. Verify Redis connection
2. Check worker logs
3. Restart workers
4. Check queue health in Bull Board

---

## 📞 SUPPORT & MAINTENANCE

### Regular Maintenance Tasks
- **Daily**: Review error logs, monitor sync health
- **Weekly**: Review database performance, check queue health
- **Monthly**: Review security logs, update dependencies
- **Quarterly**: Rotate secrets, review RLS policies

### Emergency Contacts
- [ ] On-call rotation established
- [ ] Escalation procedures documented
- [ ] Incident response playbook ready

---

## ✅ PRODUCTION LAUNCH CHECKLIST

**Pre-Launch (1 week before)**
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Load testing performed
- [ ] Monitoring configured
- [ ] Backups automated
- [ ] Documentation complete

**Launch Day**
- [ ] Deploy to production
- [ ] Verify health checks passing
- [ ] Run smoke tests
- [ ] Monitor error rates (target: <0.1%)
- [ ] Monitor API latency (target: p95 <500ms)
- [ ] Team on standby for first 4 hours

**Post-Launch (1 week after)**
- [ ] Review all error logs
- [ ] Analyze performance metrics
- [ ] Gather user feedback
- [ ] Fix any critical issues
- [ ] Document lessons learned

---

**Estimated Setup Time**: 4-6 hours (excluding tests)  
**Recommended Team Size**: 2-3 engineers for smooth deployment

🎉 **Good luck with your production launch!**
