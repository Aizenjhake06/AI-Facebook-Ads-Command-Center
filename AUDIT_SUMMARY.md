# 🔍 SYSTEM AUDIT SUMMARY - AI Facebook Ads Command Center

**Generated:** June 21, 2026

---

## EXECUTIVE SUMMARY

Complete fullstack Next.js SaaS platform para sa Meta Ads management with AI-powered insights, forecasting, & recommendations. Multi-tenant architecture with workspace isolation at database level.

### Key Stats
- **Architecture**: Next.js 16 (React 19) + Supabase PostgreSQL
- **Database Tables**: 21 main tables + functions/triggers/policies
- **API Endpoints**: 30+ routes for data management
- **Features**: Sync, Analytics, Recommendations, Forecasting, Alerts, Reports
- **Security**: RLS policies, OAuth, Rate limiting, Encrypted tokens
- **Users**: Multi-tenant with role-based access (owner/admin/member/viewer)

---

## SYSTEM ARCHITECTURE

```
┌────────────────────────────────┐
│   Next.js Frontend (React 19)   │
│  - 14 dashboard pages            │
│  - Auth pages (login/register)   │
│  - Middleware for session check  │
└────────────┬─────────────────────┘
             │
      ┌──────▼──────┐
      │  API Routes │
      │ (Backend)   │
      └──────┬──────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────┐   ┌──────────────────┐
│Supabase │   │Meta Ads API      │
│ Auth    │   │(OAuth + Sync)    │
└─────────┘   └──────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│   PostgreSQL Database           │
│   - Users & Workspaces          │
│   - Meta Connections            │
│   - Campaigns, Ad Sets, Ads     │
│   - Insights (metrics)          │
│   - Recommendations, Forecasts  │
│   - Alerts, Notifications       │
│   - Reports                     │
└─────────────────────────────────┘
```

---

## COMPLETE DATA FLOW (USER JOURNEY)

### 1️⃣ USER REGISTRATION & LOGIN
```
User → /register → Supabase Auth → users table created
           ↓
       Session stored in httpOnly cookies
           ↓
    /dashboard (protected route)
```

**Security**: Middleware validates session, rate limits 100 req/min per IP

### 2️⃣ WORKSPACE CREATION
```
New user → /workspaces/new → Create workspace
    ↓
Create record: workspaces table (owner_id = current user)
    ↓
Trigger: create_workspace_membership() → owner role auto-assigned
    ↓
workspace_members table updated
```

**Isolation**: All data queries filter by workspace_id → Multi-tenant ready

### 3️⃣ META ACCOUNT CONNECTION (OAuth Flow)
```
User → /ad-accounts → "Connect Account"
    ↓
Redirect to Meta OAuth dialog
    ↓
User authorizes (scopes: ads_management, ads_read, business_management)
    ↓
/api/meta/callback receives auth code
    ↓
Exchange code → access token
    ↓
Encrypt & store in meta_connections table:
   - facebook_user_id
   - encrypted_access_token (AES-256 or bcrypt)
   - encrypted_refresh_token
   - status: 'active'
   ↓
Trigger first sync of business managers
```

**Token Security**: Encrypted at rest, never exposed to client, server-only access

### 4️⃣ DATA SYNCHRONIZATION (Meta → Database)

#### Sync Hierarchy:
```
Business Managers (level 1)
    └─ Ad Accounts (level 2)
        └─ Campaigns (level 3)
            └─ Ad Sets (level 4)
                └─ Ads (level 5)
                    └─ Insights/Metrics (daily aggregation)
```

#### Sync Process:
```
STEP 1: Fetch business managers from Meta API
        → Store in meta_business_managers table

STEP 2: For each BM, fetch ad accounts
        → Store in meta_ad_accounts table

STEP 3: For each account, fetch campaigns
        → Store in meta_campaigns table

STEP 4: For each campaign, fetch ad sets
        → Store in meta_ad_sets table

STEP 5: For each ad set, fetch ads
        → Store in meta_ads table

STEP 6: For each entity, fetch daily insights (metrics)
        → Store in meta_insights table:
           • entity_type: 'account' | 'campaign' | 'adset' | 'ad'
           • date: YYYY-MM-DD
           • Metrics: spend, impressions, clicks, conversions, ROAS, CPA, CTR, etc.
           • UNIQUE(entity_type, entity_id_meta, date)

STEP 7: Log sync details
        → meta_sync_logs (audit trail)
        → meta_sync_state (cursor tracking for resumable syncs)
```

**Frequency**: Insights every 6h, Campaigns 12h, Managers daily

### 5️⃣ CAMPAIGN ANALYTICS
```
User → /analytics
    ↓
Query: SELECT campaigns WHERE workspace_id = current_workspace
    ↓
Query: SELECT metrics FROM meta_insights (date range specified)
    ↓
Aggregate: Spend, impressions, clicks, conversions, ROAS, CPA, CTR
    ↓
Display: Charts, tables, trend comparisons (weekly, monthly)
```

### 6️⃣ AI RECOMMENDATIONS GENERATION
```
User → /recommendations
    ↓
Fetch campaigns + latest 7+ days of insights
    ↓
For each campaign:
   1. Calculate Health Score:
      • ROAS component (40%): Current ROAS / 4.0 benchmark
      • CTR component (30%): Current CTR / 2.0% benchmark
      • CPA component (30%): 1 - (Current CPA / $50 benchmark)
      • Final score: weighted average
   
   2. Evaluate rules:
      • ROAS > 3.0 & health >= 80 → "increase_budget" (scale winners)
      • ROAS < 0.8 & spend > $100 → "decrease_budget" (cut losses)
      • Health < 40 & spend > $50 → "pause" (emergency stop)
      • ROAS > 3.0 & health >= 80 & high spend → "duplicate" (scale test)
      • Frequency > 4 & CTR < 0.5% → "refresh_creatives" (ad fatigue)
      • CTR > 0.8% & ROAS > 1.5 & frequency > 3 → "expand_audience"
   
   3. Calculate confidence score:
      • Base: health_score / 100
      • Adjust for data quality (sufficient spend/impressions)
      • Only recommend if confidence >= 0.4
   ↓
Save: campaign_recommendations table (status: pending)
    ↓
Display: Cards with action, confidence, reasoning, current vs. suggested values
```

**Output**: User can apply or dismiss each recommendation

### 7️⃣ FORECASTING ENGINE
```
User → /forecasts
    ↓
Fetch: 7-30 days historical metrics from meta_insights
    ↓
Select forecast type: revenue, spend, ROAS, CPA, or purchases
    ↓
Apply model:
   1. Exponential smoothing (α=0.3) - noise reduction
   2. Linear regression - trend line fit
   3. Confidence intervals - prediction bands (95%, 99%)
    ↓
Generate: 14-day daily forecasts with lower/upper bounds
    ↓
Detect trend: Recent avg vs. prior avg → up/down/stable + % change
    ↓
Save: campaign_forecasts table
    ↓
Display: Chart with prediction band, daily breakdown table
```

**Accuracy**: Depends on data consistency & minimal anomalies

### 8️⃣ ALERT GENERATION
```
Alert scan runs (hourly or triggered):
    ↓
For each campaign, fetch today's metrics
    ↓
Evaluate 7 alert rules:
   1. ROAS Drop (30%+ decline from previous day)
      → warning/critical, dedup window: 24h
   2. CPA Spike (40%+ increase)
      → warning/critical, dedup window: 24h
   3. High Frequency (> 5.0)
      → warning/critical, dedup window: 48h
   4. Creative Fatigue (40% CTR drop)
      → warning, dedup window: 72h
   5. Spend Anomaly (50% day-over-day change)
      → warning/critical, dedup window: 12h
   6. Pixel Issue (spend > $50, conversions = 0)
      → CRITICAL, dedup window: 24h
   7. Learning Limited (unusual spend/impression ratio)
      → info, dedup window: 48h
    ↓
Dedup check: Prevent same alert twice in window
    ↓
Save: campaign_alerts table (status: active)
    ↓
Create: user_notifications (respects preferences & quiet hours)
    ↓
Send: In-app + optional email notifications
    ↓
Display: /alerts page with severity badges, metrics vs. thresholds
```

### 9️⃣ REPORT GENERATION
```
User → /reports → Select type:
                   • campaign_summary
                   • performance
                   • insights
                   • health
                   • recommendations
                   • forecasts
                   • alerts
    ↓
Set filters: Date range, campaigns, metrics
    ↓
Create: campaign_reports record (status: pending)
    ↓
Generate content:
   • Query aggregated data
   • Format as CSV/Excel/PDF
   • Store file_url in database
    ↓
Update status: completed
    ↓
Display: Download button
    ↓
Optional: Create share link
   • Generate unique token
   • Store in shareable_reports table
   • Set expiration (default 7 days)
   • Optional password protection
```

---

## DATABASE SCHEMA (21 Tables)

### Users & Workspaces (3 tables)
- `users` - Supabase auth profiles
- `workspaces` - Multi-tenant containers
- `workspace_members` - Role-based access (owner/admin/member/viewer)

### Meta Integration (8 tables)
- `meta_connections` - OAuth tokens (encrypted)
- `meta_business_managers` - BM hierarchy
- `meta_ad_accounts` - Ad accounts with balances
- `meta_campaigns` - Campaign definitions
- `meta_ad_sets` - Ad set targeting
- `meta_ads` - Individual creatives
- `meta_insights` - Daily metrics time series
- `meta_sync_logs` - Audit trail
- `meta_sync_state` - Cursor tracking

### AI Features (3 tables)
- `campaign_recommendations` - Generated actions
- `campaign_forecasts` - Predictions
- `campaign_alerts` - Performance anomalies
- `alert_dedup` - Dedup tracking

### Reporting & Comms (5 tables)
- `campaign_reports` - Generated reports
- `shareable_reports` - Public share links
- `user_notifications` - In-app & email
- `notification_preferences` - User settings
- `saved_views` - Dashboard customization

**Security**: All tables have RLS enabled, encrypted tokens, audit timestamps

---

## API ENDPOINTS

### Authentication
- `POST /api/auth/register` - User signup
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - Session end
- `GET /api/auth/callback` - Supabase callback
- `POST /api/meta/connect` - Start OAuth
- `GET /api/meta/callback` - OAuth callback

### Data Management
- `GET /api/meta/campaigns` - List campaigns
- `GET /api/meta/adsets` - List ad sets
- `GET /api/meta/ads` - List ads
- `GET /api/meta/insights` - Get metrics
- `GET /api/meta/status` - Connection status

### Features
- `GET /api/recommendations` - Get recommendations
- `GET /api/forecasts` - Get forecasts
- `GET /api/alerts` - Get alerts
- `GET /api/reports` - List reports
- `POST /api/reports/generate` - Create report
- `GET /api/reports/download/{id}` - Download

### Sync
- `POST /api/meta/sync` - Manual sync
- `GET /api/meta/sync-status` - Sync progress

**Rate Limit**: 100 requests/min per IP with Redis/in-memory fallback

---

## KEY BUSINESS LOGIC

### Health Score Calculation
```
ROAS Score (40%): MIN((ROAS / 4.0) * 100, 100)
CTR Score (30%): MIN((CTR / 2.0%) * 100, 100)
CPA Score (30%): MAX(100 - (CPA / $50) * 100, 0)

Final = (ROAS × 0.4) + (CTR × 0.3) + (CPA × 0.3)

Categories:
80+  → Excellent (scale)
60-79 → Good (maintain)
40-59 → Fair (optimize)
<40  → Poor (pause)
```

### Confidence Scoring
```
Base confidence = health_score / 100
Adjusted by:
  • Data quality (spend >= $500, impressions >= 10k) → 0.95x
  • Data recency (<7 days) → 0.7x
  • Final capped at 0.99

Only show recommendation if confidence >= 0.4 (40%)
```

### Forecasting Model
```
1. Exponential Smoothing: S_t = 0.3 × Y_t + 0.7 × S_{t-1}
2. Linear Regression: y = slope × x + intercept
3. Confidence Intervals: predicted ± (z_score × std_dev)
4. Trend: recent avg vs. prior avg → up/down/stable
```

---

## SECURITY & AUTH

### Authentication
- Supabase Auth (email/password + OAuth)
- httpOnly secure cookies (SSR via @supabase/ssr)
- Automatic token refresh
- Rate limiting: 100 req/min per IP

### Authorization
- **Middleware**: Session validation on protected routes
- **API**: Workspace membership checks
- **Database**: RLS policies enforce data isolation
- **Roles**: owner > admin > member > viewer

### Data Protection
- Access tokens encrypted (bcrypt/AES-256)
- All data filtered by workspace_id
- RLS policies on every table
- Audit logging on critical operations

---

## PERFORMANCE & OPTIMIZATION

### Database
- 60+ indexes on common query patterns
- Composite indexes for multi-column filters
- JSONB fields for flexible storage
- Incremental syncs with cursor tracking

### Frontend
- Server components by default (Next.js 16)
- Client components for interactivity
- Recharts for efficient chart rendering
- Debounced search/filter inputs

### Caching
- Workspace/user context (React Provider)
- Report generation with file caching
- Sync state cursor to avoid re-fetching

---

## DEPLOYMENT & INFRASTRUCTURE

### Tech Stack
- **Runtime**: Node.js 18+
- **Container**: Docker compatible
- **Deployment**: Netlify, Vercel, or standalone
- **Rate Limiting**: Redis (Upstash) or in-memory fallback
- **Database**: Supabase (PostgreSQL)

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_JWT_SECRET
UPSTASH_REDIS_REST_URL (optional)
UPSTASH_REDIS_REST_TOKEN (optional)
```

---

## IDENTIFIED GAPS & RECOMMENDATIONS

### 1. Background Job Queue
**Current**: No visible background job processing
**Recommendation**: Add Bull/BullMQ for scheduled syncs, alert scanning, forecasts
**Impact**: Move heavy processing off request-response cycle

### 2. Caching Layer
**Current**: Sync state tracked, but no Redis caching
**Recommendation**: Cache aggregated metrics, recommendations, forecasts
**Impact**: 10x faster dashboard loads, reduced DB queries

### 3. WebSocket Support
**Current**: Polling-based, no real-time updates
**Recommendation**: WebSocket connections for live metrics & alerts
**Impact**: Real-time dashboard, instant notifications

### 4. Error Recovery
**Current**: Sync failures logged, but no auto-retry
**Recommendation**: Exponential backoff + dead letter queue
**Impact**: Resilient syncs, automatic recovery

### 5. Monitoring & Observability
**Current**: Basic health check endpoint
**Recommendation**: OpenTelemetry traces, custom metrics, alerting
**Impact**: Production-grade monitoring & debugging

### 6. Testing Coverage
**Current**: jest.config.ts setup, but unclear coverage
**Recommendation**: 80%+ coverage on critical paths (auth, sync, forecasts)
**Impact**: Confident deployments, fewer bugs

### 7. API Documentation
**Current**: API_DOCUMENTATION.md exists
**Recommendation**: OpenAPI/Swagger spec, auto-generated from code
**Impact**: Better developer experience, clear contracts

### 8. Data Retention Policies
**Current**: No visible retention/archival strategy
**Recommendation**: Archive old insights, compress historical data
**Impact**: Database performance & storage optimization

---

## DEPLOYMENT READINESS CHECKLIST

- [x] Database schema created (20+ tables with RLS)
- [x] Authentication implemented (Supabase Auth + OAuth)
- [x] API routes defined (30+ endpoints)
- [x] UI pages built (14 dashboard pages + auth)
- [x] Business logic coded (Health score, recommendations, forecasts, alerts)
- [ ] Comprehensive testing (need E2E tests)
- [ ] Error handling hardened (add retry logic)
- [ ] Monitoring configured (need observability)
- [ ] Documentation complete (API docs exist, system audit needed)
- [ ] Performance tested (need load testing)
- [ ] Security audit performed (need penetration testing)
- [ ] Deployment automation (Docker, CI/CD pipelines needed)

---

## CONCLUSION

Well-architected Next.js SaaS platform with solid data model, comprehensive feature set, and proper multi-tenancy implementation. Ready for alpha testing with recommendations for production hardening (background jobs, caching, monitoring).

**Development Status**: Feature-complete for MVP
**Production Readiness**: 70% (needs monitoring, testing, error recovery)
**Estimated Timeline**: 2-3 weeks for production-grade setup

