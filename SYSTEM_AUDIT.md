# 🔍 AI FACEBOOK ADS COMMAND CENTER - COMPREHENSIVE SYSTEM AUDIT

## Document Purpose
Complete audit ng system flow from user registration → data sync → AI analysis → reporting.

---

## 📋 TABLE OF CONTENTS
1. [Project Architecture Overview](#1-project-architecture-overview)
2. [Stack & Technologies](#2-stack--technologies)
3. [Complete User Flow](#3-complete-user-flow-login-to-insights)
4. [Data Architecture](#4-data-architecture)
5. [API Endpoints Map](#5-api-endpoints-map)
6. [Feature Deep Dive](#6-feature-deep-dive)
7. [Security & Auth](#7-security--authorization)
8. [Performance Metrics](#8-performance-analysis)
9. [Issues & Recommendations](#9-identified-issues--recommendations)
10. [Deployment Checklist](#10-deployment-readiness-checklist)

---

## 1. PROJECT ARCHITECTURE OVERVIEW

### High-Level Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js + React)                   │
│  • Dashboard, Campaigns, Analytics, Alerts, Forecasts, Reports  │
│  • Tailwind CSS + Lucide React icons                           │
│  • Recharts for data visualization                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    NEXT.JS API ROUTES
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
│ Supabase Auth   │ │  PostgreSQL  │ │ Meta/Facebook│
│ (Session Mgmt)  │ │  (Database)  │ │  Ads API     │
└─────────────────┘ └──────────────┘ └──────────────┘
        │
  ┌─────────────────────────┐
  │ Business Logic Services │
  ├─────────────────────────┤
  │ • Health Scoring        │
  │ • Recommendations       │
  │ • Forecasting           │
  │ • Alerts & Insights     │
  └─────────────────────────┘
```

### Key Characteristics
- **Monolithic Next.js application** (fullstack)
- **Multi-tenant** with workspace isolation
- **Server-side rendering** with client components
- **Real-time data** from Meta Ads API
- **AI/ML features** for recommendations & forecasting

---

## 2. STACK & TECHNOLOGIES

### Core Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 19.2.4 |
| **Meta Framework** | Next.js | 16.2.9 |
| **Styling** | Tailwind CSS | 4 |
| **UI Components** | Lucide React | 1.21.0 |
| **Charts** | Recharts | 3.8.1 |
| **Database** | Supabase (PostgreSQL) | Latest |
| **Auth** | Supabase Auth | with OAuth |
| **API Client** | @supabase/supabase-js | 2.108.2 |
| **SSR Support** | @supabase/ssr | 0.12.0 |
| **Validation** | Zod | 4.4.3 |
| **Testing** | Jest | 30.4.2 |
| **Linting** | ESLint | 9 |

### Infrastructure
- **Runtime**: Node.js (v18+)
- **Container**: Docker compatible
- **Deployment**: Netlify, Vercel, or standalone
- **Rate Limiting**: Redis (Upstash) or in-memory fallback

---

## 3. COMPLETE USER FLOW: LOGIN TO INSIGHTS

### Phase 1: User Registration & Authentication

```
USER REGISTRATION FLOW:
  1. User visits /register
  2. Enters email & password
  3. Supabase Auth validates & creates user in auth.users
  4. Trigger: handle_new_user() → Creates profile in users table
  5. User profile with email, full_name, avatar_url stored
  
USER LOGIN FLOW:
  1. User visits /login
  2. Enters email & password
  3. Supabase validates credentials
  4. Session stored in httpOnly secure cookies (via @supabase/ssr)
  5. Middleware validates session on protected routes
  6. If invalid/expired → redirect to /login
  7. If valid → load dashboard or requested page
  
SESSION MANAGEMENT:
  • Tokens: Access token (expires in ~1 hour)
  • Refresh: Automatic refresh using refresh token
  • Storage: httpOnly cookies (secure, no JS access)
  • Rate Limit: 100 requests/minute per IP
```

### Phase 2: Workspace Setup
```
WORKSPACE CREATION:
  1. First-time user redirected to /workspaces/new
  2. User creates workspace (name, slug required)
  3. Workspace record inserted with owner_id = current user
  4. Trigger: create_workspace_membership() → Owner role auto-assigned
  5. Workspace appears in workspace selector
  6. Middleware validates workspace_id in subsequent requests

WORKSPACE STRUCTURE:
  • Workspace = Multi-tenant container
  • workspace_members table tracks team access
  • Roles: owner > admin > member > viewer
  • Each user can be in multiple workspaces
  • RLS policies enforce data isolation
```

### Phase 3: Meta Account Connection
```
OAUTH FLOW WITH META:
  1. User visits /ad-accounts
  2. Clicks "Connect Meta Account"
  3. Frontend redirects to /api/meta/connect
  4. /api/meta/connect initiates Meta OAuth (Facebook Login)
  5. Scopes requested:
     - email
     - public_profile
     - business_management
     - ads_management
     - ads_read
  6. User authorizes in Facebook Login Dialog
  7. Meta redirects to /api/meta/callback with auth code
  8. Backend exchanges code for access token
  9. Access token encrypted: bcrypt or AES-256
  10. Store in meta_connections table:
      - workspace_id (workspace isolation)
      - user_id (who connected)
      - facebook_user_id (Meta user ID)
      - encrypted_access_token
      - encrypted_refresh_token
      - status: 'active'
      - granted_scopes: JSON array
  11. Trigger first data sync (business managers fetch)
  12. Redirect to dashboard with success message

TOKEN SECURITY:
  • Encrypted at rest in Postgres
  • Never exposed to client (server-only)
  • Refresh token securely rotated
  • Expiration tracked & monitored
```

### Phase 4: Data Synchronization (Meta → Database)
```
SYNC TRIGGER POINTS:
  A) Manual: User clicks "Sync Now" button
  B) Scheduled: Background jobs every 6/12/24 hours
  C) Initial: First time connecting account

SYNC PROCESS (Hierarchical):

STEP 1: Fetch Business Managers
  └─ Call: GET /me/business_managers (Meta API)
  └─ For each BM:
     • Store in meta_business_managers table
     • Set last_synced_at timestamp
     • Log in meta_sync_logs

STEP 2: Fetch Ad Accounts (per Business Manager)
  └─ Call: GET /{business_manager}/ad_accounts (Meta API)
  └─ For each ad account:
     • Store in meta_ad_accounts table
     • Fields: ad_account_id, name, status, currency, balance, etc.
     • Set last_synced_at & is_active

STEP 3: Fetch Campaigns (per Ad Account)
  └─ Call: GET /{ad_account}/campaigns (Meta API)
  └─ Paginate through all campaigns
  └─ For each campaign:
     • Store in meta_campaigns table
     • Fields: campaign_id, name, objective, status, budget, etc.
     • Create data_hash for change detection

STEP 4: Fetch Ad Sets (per Campaign)
  └─ Call: GET /{campaign}/adsets (Meta API)
  └─ For each ad set:
     • Store in meta_ad_sets table
     • Fields: adset_id, name, targeting (JSONB), bid strategy, etc.
     • Link to campaign via campaign_id FK

STEP 5: Fetch Ads (per Ad Set)
  └─ Call: GET /{adset}/ads (Meta API)
  └─ For each ad:
     • Store in meta_ads table
     • Fields: ad_id, name, creative (JSONB), display_format, etc.

STEP 6: Fetch Insights/Metrics (Daily Aggregation)
  └─ Call: GET /{entity}/insights (Meta API)
  └─ Supported entities: account, campaign, adset, ad
  └─ For each entity:
     • Query date range (default: last 30 days)
     • Aggregate by date
     • Store in meta_insights table:
       - entity_type: 'account' | 'campaign' | 'adset' | 'ad'
       - entity_id_meta: Meta object ID
       - date: YYYY-MM-DD
       - Metrics: spend, impressions, clicks, reach, frequency
       - Metrics: cpm, cpc, ctr, conversions, roas, cpa
       - Metrics: purchase_value, purchases, actions (JSONB)
  └─ UNIQUE constraint: (entity_type, entity_id_meta, date)
     → Prevents duplicate daily records

SYNC LOGGING & STATE TRACKING:

  meta_sync_logs entry created:
    • sync_type: 'full' | 'incremental' | 'manual' | 'scheduled'
    • entity_type: 'all' | 'campaigns' | 'insights' | etc.
    • status: 'pending' → 'running' → 'completed' | 'failed'
    • total_records, processed_records, failed_records
    • started_at, completed_at (duration calculated)
    • error_message if failed
    • rate_limit_remaining (from Meta API response)
    
  meta_sync_state entry updated:
    • Tracks last_sync_at & last_successful_sync_at
    • Stores cursor for pagination-based syncs
    • error_count (resets on success)
    • Used for incremental syncs & resumability

SYNC FREQUENCY RECOMMENDED:
  • Insights (metrics): Every 6 hours
  • Campaigns/Ad Sets/Ads: Every 12 hours
  • Business Managers/Ad Accounts: Daily
```

### Phase 5: Campaign Analytics & Insights
```
WHEN USER VIEWS /ANALYTICS:

1. LOAD CAMPAIGNS
   └─ Query: SELECT * FROM meta_campaigns 
      WHERE ad_account_id IN (
        SELECT id FROM meta_ad_accounts 
        WHERE meta_connection_id IN (
          SELECT id FROM meta_connections 
          WHERE workspace_id = current_workspace
        )
      )
   └─ Result: List of campaigns with status, budget, sync time

2. LOAD METRICS FOR DATE RANGE
   └─ Query: SELECT * FROM meta_insights
      WHERE entity_type = 'campaign'
      AND entity_id_meta = campaign_id
      AND date >= start_date AND date <= end_date
   └─ Result: Daily metrics time series

3. CALCULATE AGGREGATIONS
   ├─ Total Spend: SUM(spend)
   ├─ Total Impressions: SUM(impressions)
   ├─ Total Clicks: SUM(clicks)
   ├─ Total Conversions: SUM(conversions)
   ├─ Avg CTR: SUM(clicks) / SUM(impressions)
   ├─ Avg CPC: SUM(spend) / SUM(clicks)
   ├─ Avg CPM: SUM(spend) / SUM(impressions) * 1000
   ├─ ROAS: SUM(purchase_value) / SUM(spend)
   ├─ CPA: SUM(spend) / SUM(conversions)
   └─ Reach: MAX(reach)

4. DISPLAY ON FRONTEND
   ├─ Table view: Campaign name, status, metrics for period
   ├─ Charts: Spend/Impressions/Clicks/Conversions trends
   ├─ Sparklines: Quick trend overview
   ├─ Comparison: Week-over-week, Month-over-month
   └─ Filters: Date range, campaign status, ad account
```

### Phase 6: AI-Powered Recommendations
```
WHEN USER VIEWS /RECOMMENDATIONS:

1. FETCH CAMPAIGN DATA
   └─ Get campaigns + latest insights
   └─ Need minimum 7 days of data for meaningful analysis

2. CALCULATE HEALTH SCORE (per campaign)
   └─ Component 1: ROAS Health (40% weight)
      • Benchmark: 4.0x
      • Score: MIN((ROAS / 4.0) * 100, 100)
   
   └─ Component 2: CTR Health (30% weight)
      • Benchmark: 2.0%
      • Score: MIN((CTR / 2.0) * 100, 100)
   
   └─ Component 3: CPA Health (30% weight)
      • Benchmark: $50
      • Score: MAX(100 - (CPA / 50) * 100, 0)
   
   └─ Final Health Score = (ROAS_score × 0.4) + (CTR_score × 0.3) + (CPA_score × 0.3)
   
   └─ Categories:
      • 80+: Excellent (recommend scaling)
      • 60-79: Good (stable, monitor)
      • 40-59: Fair (needs optimization)
      • <40: Poor (recommend pause)

3. GENERATE RECOMMENDATIONS (by action type)

   ACTION: INCREASE BUDGET (Scale Winners)
   ├─ Trigger: ROAS > 3.0x AND health_score >= 80
   ├─ Secondary: ROAS > 2.0x AND health_score >= 70
   ├─ Recommended increase: 20-30%
   ├─ Confidence: high if spend > $500 in period
   
   ACTION: DECREASE BUDGET (Stop Losers)
   ├─ Trigger: ROAS < 0.8x AND spend > $100
   ├─ OR: CPA > benchmark AND spend > $100
   ├─ Recommended decrease: 20%
   ├─ Prevents further losses
   
   ACTION: PAUSE (Emergency Stop)
   ├─ Trigger: health_score < 40 AND total_spend > $50
   ├─ Severity: Critical
   ├─ Reasoning: Budget being wasted
   
   ACTION: DUPLICATE (Test & Scale)
   ├─ Trigger: ROAS > 3.0x AND health_score >= 80 AND spend > $500
   ├─ Purpose: Test audience variations
   ├─ Maintain winning formula while exploring new segments
   
   ACTION: REFRESH CREATIVES (Combat Fatigue)
   ├─ Trigger: frequency > 4.0 AND CTR < 0.5%
   ├─ OR: frequency > 5.0 regardless of CTR
   ├─ Reason: Ad fatigue from repeated impressions
   
   ACTION: EXPAND AUDIENCE (Find New Demand)
   ├─ Trigger: CTR > 0.8% AND ROAS > 1.5x AND frequency > 3.0
   ├─ Strategy: Add lookalike audiences or expand targeting
   ├─ Confidence: High if metrics consistent for 7+ days

4. CALCULATE CONFIDENCE SCORE
   ├─ Base: health_score / 100 (range 0-1)
   ├─ Adjustments:
   │  ├─ If spend >= $500: × 0.95 (multiply by reduction factor)
   │  ├─ If impressions >= 10k: × 0.95
   │  ├─ If data points < 7 days: × 0.7 (insufficient data)
   │  └─ Final: MIN(confidence × 0.95, 0.99)
   ├─ Only show if confidence >= 0.4 (40%)
   
5. SAVE RECOMMENDATIONS
   └─ Insert into campaign_recommendations table:
      • campaign_id, workspace_id
      • action_type, confidence_score
      • reasoning (generated text)
      • current_metrics (JSONB)
      • suggested_value (JSONB)
      • status: 'pending' (until applied/dismissed)

6. DISPLAY ON FRONTEND
   ├─ Card per recommendation
   ├─ Show: action_type, confidence badge, reasoning
   ├─ Current metrics & suggested values side-by-side
   ├─ Buttons: Apply | Dismiss | Learn More
   └─ Filter: By action type, confidence, health score
```

### Phase 7: Forecasting & Predictions
```
WHEN USER VIEWS /FORECASTS:

1. FETCH TIME SERIES DATA
   └─ Query: SELECT date, spend, purchases, impressions, clicks
      FROM meta_insights
      WHERE campaign_id = selected_campaign
      AND date >= NOW() - 30 days
      ORDER BY date ASC
   └─ Minimum required: 7 data points
   └─ Optimal: 30 days of data for trend detection

2. SELECT FORECAST TYPE
   ├─ Revenue (total_purchase_value)
   ├─ Spend (ad_spend)
   ├─ ROAS (revenue / spend)
   ├─ CPA (spend / conversions)
   └─ Purchases (conversion_count)

3. APPLY FORECASTING MODEL

   STEP A: Exponential Smoothing
   └─ Smooth historical values using α = 0.3
   └─ Reduces noise, emphasizes recent trends
   └─ Formula: S_t = α × Y_t + (1 - α) × S_{t-1}

   STEP B: Linear Regression
   └─ Fit trend line to smoothed data
   └─ Calculate slope (m) and intercept (b)
   └─ Formula: y = m × x + b
   └─ Calculate R² (goodness of fit)

   STEP C: Generate Predictions
   └─ For each day in forecast period (default 14 days):
      • Y_predicted = slope × future_day + intercept
      • Generate daily forecast value

   STEP D: Calculate Confidence Intervals
   └─ Standard deviation of residuals
   └─ Z-score for confidence level (95% = 1.96, 99% = 2.576)
   └─ confidence_lower = predicted - (z_score × std_dev)
   └─ confidence_upper = predicted + (z_score × std_dev)

4. DETECT TREND
   └─ Compare: recent 7-day average vs. 7-14 days ago
   └─ Trend direction: up (>5% increase) | down | stable
   └─ Trend percentage: ((recent - prior) / prior) × 100

5. SAVE FORECASTS
   └─ Insert into campaign_forecasts table:
      • campaign_id, workspace_id
      • forecast_type (revenue, spend, ROAS, CPA, purchases)
      • forecast_period_days (e.g., 14)
      • predicted_value (sum of daily forecasts)
      • confidence_lower, confidence_upper
      • confidence_level (0.95 or 0.99)
      • historical_data_points (used in calculation)
      • model_version ('v1.0')
      • generated_at (timestamp)

6. DISPLAY ON FRONTEND
   ├─ Chart with:
   │  ├─ Historical data (line)
   │  ├─ Predicted values (line with different style)
   │  ├─ Confidence band (shaded area)
   │  └─ Today line (vertical marker)
   ├─ Summary box:
   │  ├─ Predicted total value
   │  ├─ Confidence range (lower - upper)
   │  ├─ Trend direction & percentage
   │  └─ Data quality indicator
   └─ Daily breakdown table with:
      ├─ Date, predicted value, lower/upper bounds
      └─ % change from previous day
```

### Phase 8: Alert Generation
```
WHEN ALERTS SCAN RUNS (hourly or on-demand):

1. FETCH TODAY'S METRICS
   └─ Query: SELECT * FROM meta_insights
      WHERE date = TODAY()
   └─ For each campaign in workspace

2. EVALUATE ALERT RULES

   RULE 1: ROAS DROP (30%+ decline)
   └─ Compare: Today's ROAS vs. Previous Day's ROAS
   └─ If: (prev_roas - today_roas) / prev_roas >= 0.30
   └─ Severity: warning if 30-50%, critical if >50%
   └─ Dedup window: 24 hours (prevent duplicate alerts)

   RULE 2: CPA SPIKE (40%+ increase)
   └─ Compare: Today's CPA vs. Previous Day's CPA
   └─ If: (today_cpa - prev_cpa) / prev_cpa >= 0.40
   └─ Severity: warning if 40-75%, critical if >75%
   └─ Dedup window: 24 hours

   RULE 3: HIGH FREQUENCY (> 5.0)
   └─ Check: Today's frequency metric
   └─ If: frequency > 5.0
   └─ Severity: warning (>5), critical (>7)
   └─ Dedup window: 48 hours
   └─ Reason: Ad fatigue, diminishing returns

   RULE 4: CREATIVE FATIGUE (40% CTR drop)
   └─ Compare: Today's CTR vs. 7-day average CTR
   └─ If: (avg_ctr - today_ctr) / avg_ctr >= 0.40
   └─ Severity: warning
   └─ Dedup window: 72 hours
   └─ Trigger: Also requires > 5k impressions (data quality)

   RULE 5: SPEND ANOMALY (50% day-over-day change)
   └─ Compare: Today's spend vs. Previous day's spend
   └─ If: |today_spend - prev_spend| / prev_spend >= 0.50
   └─ Severity: warning (unexpected change)
   └─ Dedup window: 12 hours (most volatile metric)

   RULE 6: PIXEL ISSUE (no conversions despite high spend)
   └─ Check: Today's conversions AND spend
   └─ If: spend > $50 AND conversions = 0
   └─ Severity: critical (potential tracking issue)
   └─ Dedup window: 24 hours
   └─ Reasoning: Conversion pixel may be broken

   RULE 7: LEARNING LIMITED (low impressions vs. spend)
   └─ Calculate: Spend / Impressions ratio
   └─ If: ratio > $1 per 10 impressions (unusual)
   └─ Severity: info (informational only)
   └─ Dedup window: 48 hours

3. DEDUPLICATION CHECK
   └─ Generate dedup_key: {alert_type}:{campaign_id}:{window_start}
   └─ Query alert_dedup table for existing key
   └─ If key exists in window → skip (prevent spam)
   └─ If key expired or doesn't exist → proceed

4. CREATE ALERT
   └─ Insert into campaign_alerts table:
      • campaign_id, workspace_id
      • alert_type, severity, title, message
      • metric_name, metric_value, threshold_value, previous_value
      • status: 'active' (until resolved/dismissed)
      • created_at timestamp
   
   └─ Insert into alert_dedup table:
      • alert_key, alert_id, created_at

5. CREATE NOTIFICATION
   └─ Insert into user_notifications table:
      • For each workspace member
      • user_id, workspace_id
      • type: 'alert', channel: based on preferences
      • title, message (derived from alert)
      • data: JSONB with alert_id, campaign_id
      • Respects notification_preferences:
        ├─ email_enabled
        ├─ alert_email
        ├─ digest_frequency
        └─ quiet_hours_start/end

6. SEND NOTIFICATIONS
   └─ In-app: Marked as unread in user_notifications
   └─ Email (optional): Send if email_enabled & alert_email = true
   └─ Respect quiet hours: Don't send 10pm-7am if configured

7. DISPLAY ON FRONTEND
   └─ /alerts page shows:
      ├─ Alert cards with severity badge (critical/warning/info)
      ├─ Campaign name, alert type icon
      ├─ Metric value vs. threshold
      ├─ Timestamp, status badge
      └─ Mark as resolved/dismissed buttons
```

### Phase 9: Report Generation
```
WHEN USER GENERATES REPORT (/reports):

1. SELECT REPORT TYPE
   ├─ campaign_summary: Overview of all campaigns
   ├─ performance: Detailed metrics by campaign/ad set/ad
   ├─ insights: AI insights and analysis
   ├─ health: Health scores and recommendations
   ├─ recommendations: All pending recommendations
   ├─ forecasts: Forecast predictions
   └─ alerts: Recent alerts and anomalies

2. SET FILTERS
   ├─ Date range: start_date → end_date
   ├─ Campaigns: Select specific campaigns or all
   ├─ Ad accounts: Filter by account
   ├─ Metrics: Select which metrics to include
   └─ Format: CSV, Excel (XLSX), or PDF

3. CREATE REPORT RECORD
   └─ Insert into campaign_reports table:
      • workspace_id, user_id
      • report_type, format, title
      • filters: JSONB with selections
      • status: 'pending' → 'generating' → 'completed'
      • created_at timestamp

4. GENERATE REPORT CONTENT

   For campaign_summary:
   └─ Query: All campaigns with aggregated metrics
   └─ Include: name, status, total spend, impressions, clicks, ROAS, CPA
   └─ Include: health score, top metrics

   For performance:
   └─ Query: meta_insights aggregated by campaign/date
   └─ Include: Daily metrics time series
   └─ Include: Charts (spend, impressions, conversions trends)

   For insights:
   └─ Query: Recent insights generated by analyzeCampaigns()
   └─ Include: Strengths, weaknesses, opportunities, risks
   └─ Include: Benchmark comparisons

   For health:
   └─ Query: Health scores for all campaigns
   └─ Include: Component scores (ROAS, CTR, CPA)
   └─ Include: Recommendations to improve

   For recommendations:
   └─ Query: campaign_recommendations with status = 'pending'
   └─ Include: Action type, confidence, reasoning
   └─ Include: Current vs. suggested values

   For forecasts:
   └─ Query: campaign_forecasts table
   └─ Include: Predicted values with confidence intervals
   └─ Include: Trend analysis

   For alerts:
   └─ Query: Recent campaign_alerts (status = 'active')
   └─ Include: Alert type, severity, message
   └─ Include: Metrics and thresholds

5. FORMAT & SAVE

   For CSV:
   └─ Plain text comma-separated values
   └─ One row per entity (campaign, ad set, etc.)
   └─ Headers with column names

   For Excel (XLSX):
   └─ Multiple sheets (one per entity type or report section)
   └─ Formatted headers with bold & colors
   └─ Autofit column widths
   └─ Include summary sheet

   For PDF:
   └─ Professional layout with:
      ├─ Header with workspace name, date range
      ├─ Table of contents
      ├─ Charts (using Recharts as images)
      ├─ Data tables
      ├─ Footer with page numbers
      └─ Company branding

   └─ Upload to cloud storage (if configured)
      or store file_path locally
   
   └─ Update campaign_reports:
      • file_url: /reports/download/{report_id}
      • file_size: bytes
      • generated_at: timestamp
      • status: 'completed'

6. CREATE SHAREABLE LINK (optional)
   └─ User clicks "Create Share Link"
   └─ Insert into shareable_reports table:
      • report_id
      • token: Random 32-char alphanumeric
      • password_hash: Optional bcrypt hash
      • expires_at: NOW() + 7 days (configurable)
      • access_count: 0
   
   └─ Share link: https://domain.com/share/reports/{token}
   └─ Accessible without login
   └─ Track access_count & last_accessed_at

7. DISPLAY ON FRONTEND
   └─ Reports list with:
      ├─ Report type, title, date range
      ├─ Status badge (completed, generating, failed)
      ├─ Download button (if completed)
      ├─ Share link button
      ├─ Delete option
      └─ Generated date & file size
```

