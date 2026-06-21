# AdPilot AI - Production Readiness TODO

This document lists every remaining improvement, bug, technical debt item, optimization opportunity, security enhancement, and future feature, prioritized by impact.

---

## Critical (Block Production)

| # | Item | Category | Details |
|---|------|----------|---------|
| C1 | **Replace XOR Token Encryption** | Security | Edge functions `meta-oauth`, `meta-sync`, and `meta-refresh` use simple XOR encryption for Meta access tokens. This is cryptographically weak and must be replaced with AES-256-GCM or equivalent before handling real production tokens. |
| C2 | **Environment Variable Validation** | Security | Edge functions use `Deno.env.get('...')!` with non-null assertions. Missing env vars will crash at runtime. Add validation and graceful error handling for `META_APP_ID`, `META_APP_SECRET`, `ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. |
| C3 | **Missing RLS UPDATE/DELETE Policies** | Security | Several tables have only SELECT/INSERT policies but lack UPDATE/DELETE: `meta_business_managers`, `meta_ad_accounts`, `meta_campaigns`, `meta_ad_sets`, `meta_ads`, `meta_insights`, `meta_sync_logs`, `meta_sync_state`, `saved_views`, `campaign_health_scores`. Add full CRUD policies. |
| C4 | **Token Refresh Cron Job** | Reliability | The `meta-refresh` edge function exists but has no scheduled cron trigger configured. Meta long-lived tokens expire after ~60 days. Set up a Supabase cron job to call this function weekly. |
| C5 | **Missing Database Migration** | Database | Migration `005` is missing from the sequence (jumps from `004` to `006`). Verify no tables were skipped. The `campaign_health_scores` migration uses `IF NOT EXISTS` but some tables may not have been created via migration. |
| C6 | **API Route Input Sanitization** | Security | Multiple API routes pass user-provided strings directly into Supabase queries (e.g., `ilike('name', %${search}%)` in `meta/ads/route.ts`). While Supabase client-side libraries escape parameters, verify all raw SQL or string interpolation is safe. |
| C7 | **Rate Limiter Not Distributed** | Security | The in-memory `Map`-based rate limiter in `middleware.ts` will not work across multiple server instances or in serverless environments. Replace with Redis or Upstash Redis for production. |
| C8 | **Missing Input Validation on API Routes** | Security | Many API routes lack request body validation (e.g., `/api/reports`, `/api/forecasts`). Malformed payloads can cause 500 errors or unexpected behavior. Add Zod or similar validation schemas. |

---

## High (Significant Impact)

| # | Item | Category | Details |
|---|------|----------|---------|
| H1 | **TypeScript `any` Usage** | Code Quality | 180+ instances of `any` across the codebase (lint errors). Replace with proper types, especially in: `src/lib/ai-chat.ts`, `src/lib/ai-analysis.ts`, `src/lib/alerts.ts`, `src/lib/forecasting.ts`, `src/lib/recommendations.ts`, `src/lib/health-score.ts`, `src/components/analytics/*.tsx`, and all API routes. |
| H2 | **React setState in Effect Warning** | Code Quality | 10 lint errors: "Calling setState synchronously within an effect can trigger cascading renders." Review `src/app/(dashboard)/ad-accounts/page.tsx`, `src/app/(dashboard)/analytics/page.tsx`, and other pages for effect dependencies and state initialization patterns. |
| H3 | **Unused Imports & Variables** | Code Quality | 109 lint warnings for unused imports/variables. Clean up dead imports across all dashboard pages and components. |
| H4 | **Missing Error Boundaries** | Reliability | No React error boundaries exist. A single component crash will unmount the entire dashboard. Add `error.tsx` files to route segments and a global error boundary. |
| H5 | **Missing Loading States** | UX | Several pages lack proper skeleton loading states. The `analytics` page table and charts show blank during data fetch. Add `loading.tsx` files to all route segments. |
| H6 | **No API Response Caching** | Performance | API routes like `/api/metrics`, `/api/insights`, and `/api/meta/insights` recompute aggregations on every request. Add Next.js `unstable_cache` or Redis caching for expensive queries. |
| H7 | **Database Query N+1 Problems** | Performance | `dashboard/page.tsx` and `analytics/page.tsx` loop over connections and fire separate queries per connection. Batch these into single queries using `IN` clauses. |
| H8 | **Missing Pagination on Large Tables** | Performance | `meta_campaigns`, `meta_ad_sets`, `meta_ads`, and `meta_insights` queries can return thousands of rows. Add server-side pagination with cursor-based or offset pagination. |
| H9 | **No Database Connection Pooling** | Performance | Supabase client is created fresh per-request in API routes. Reuse connections or ensure pool settings are configured for production load. |
| H10 | **Missing Soft Deletes** | Data Integrity | No `deleted_at` columns on any table. Accidental deletes are permanent. Add soft delete support to `workspaces`, `meta_connections`, `meta_campaigns`, and other core entities. |
| H11 | **Edge Function Error Handling** | Reliability | `meta-sync` edge function has broad try/catch that swallows errors. Individual entity sync failures should be logged per-entity, not abort the entire sync. |
| H12 | **Missing Webhook/Event System** | Architecture | No event-driven architecture for async operations. Sync jobs, report generation, and alert scanning should be queue-backed (Supabase Realtime or BullMQ) rather than synchronous API calls. |
| H13 | **No Database Backup Strategy Documented** | Operations | While Supabase handles automated backups, document RPO/RTO targets and test restore procedures. |
| H14 | **Missing API Rate Limit Headers** | Security | API routes don't return `X-RateLimit-*` headers. The middleware adds them but API routes should also self-enforce limits. |
| H15 | **Inconsistent Date Handling** | Code Quality | Mix of `new Date().toISOString()`, `Date.now()`, and string dates. Standardize on ISO 8601 UTC throughout. |

---

## Medium (Should Address Soon)

| # | Item | Category | Details |
|---|------|----------|---------|
| M1 | **Missing Unit Tests for API Routes** | Testing | Only 5 test files exist for library functions. Zero tests for API routes, React components, or integration flows. Add tests for critical paths: auth, workspace CRUD, Meta sync, report generation. |
| M2 | **Missing E2E Tests** | Testing | No Playwright or Cypress tests exist. Add smoke tests for login flow, dashboard navigation, and workspace switching. |
| M3 | **Accessibility Audit** | UX | No ARIA labels on many interactive elements. Charts lack screen reader alternatives. Run axe-core audit and fix violations. |
| M4 | **Mobile Responsiveness Gaps** | UX | Analytics table overflows on mobile. Sidebar doesn't collapse properly. Workspace dropdown is cut off on small screens. |
| M5 | **Missing Dark Mode Toggle** | UX | Dark mode is hardcoded. Add a theme toggle and persist preference. Ensure all third-party charts respect theme. |
| M6 | **Chart Performance with Large Datasets** | Performance | Recharts renders all data points even for multi-month datasets. Add data decimation or virtualized rendering for >1000 points. |
| M7 | **Missing Image Optimization** | Performance | User avatars and Meta profile pictures are loaded without `next/image` optimization. Some use raw `<img>` tags. |
| M8 | **No Service Worker / PWA** | Feature | Could add offline capability for dashboard data caching. Not critical but improves UX. |
| M9 | **Missing Health Check Endpoint** | Operations | `/api/health` exists but only checks database. Add checks for: Supabase auth, Meta API connectivity, edge function availability, disk space. |
| M10 | **Logging Inconsistency** | Operations | Mix of `console.error`, `console.log`, and silent catches. Standardize on a structured logger (Pino/Winston) with log levels. |
| M11 | **Missing API Versioning** | Architecture | All API routes are unversioned (`/api/...`). Plan for `/api/v1/...` or header-based versioning before public API consumers. |
| M12 | **Duplicate Formatter Logic** | Code Quality | `formatNumber`, `formatCurrency`, `formatPercent` exist in both `src/lib/formatters.ts` and inline in components. Consolidate all formatting through the shared library. |
| M13 | **Missing Data Export Formats** | Feature | Reports only generate CSV. Excel and PDF formats are UI options but not implemented in the backend. |
| M14 | **AI Chat No Streaming** | Feature | AI assistant responses are returned as single JSON blobs. Add Server-Sent Events (SSE) or streaming for better perceived performance. |
| M15 | **Missing Campaign Comparison** | Feature | No side-by-side campaign comparison tool. Users must manually compare metrics across campaigns. |
| M16 | **No Bulk Operations** | Feature | Cannot bulk-edit campaign status, bulk-sync, or bulk-export. All operations are single-entity. |
| M17 | **Notification Email Delivery** | Feature | Notification system has email flags but no actual email sending integration (SendGrid/Resend/Postmark). |
| M18 | **Missing Audit Log UI** | Feature | Audit logs are written to DB but no admin UI exists to view them. |
| M19 | **Workspace Settings Incomplete** | Feature | Settings page lists "Alerts & Notifications", "Security", "API Keys" as links but no pages exist for them. |
| M20 | **Missing User Onboarding Flow** | UX | New users see empty dashboard with no guidance. Add a guided tour or onboarding checklist. |

---

## Low (Nice to Have / Future)

| # | Item | Category | Details |
|---|------|----------|---------|
| L1 | **Add Storybook for Components** | DevEx | Document UI components in isolation for design system consistency. |
| L2 | **Add Husky + lint-staged** | DevEx | Pre-commit hooks to enforce linting and formatting before commits. |
| L3 | **Add Prettier Configuration** | DevEx | No `.prettierrc` exists. Standardize code formatting across the team. |
| L4 | **Add Commitlint** | DevEx | Enforce conventional commit messages for changelog generation. |
| L5 | **Add Sentry Error Tracking** | Operations | Integrate Sentry or similar for production error monitoring and alerting. |
| L6 | **Add OpenTelemetry Tracing** | Operations | Distributed tracing for API routes and edge functions. |
| L7 | **Add Feature Flags** | Architecture | LaunchDarkly or Unleash integration for gradual rollouts of new features. |
| L8 | **Add A/B Testing Framework** | Feature | Experiment with UI variations and AI recommendation algorithms. |
| L9 | **Multi-Language Support** | Feature | i18n for Spanish, Portuguese, and other markets where Meta Ads is popular. |
| L10 | **Advanced Forecasting Models** | Feature | Replace linear regression with Prophet, ARIMA, or ML models for better accuracy. |
| L11 | **Custom Alert Thresholds** | Feature | Allow users to configure their own alert thresholds per campaign. |
| L12 | **Slack/Teams Integration** | Feature | Send alerts and daily digests to Slack/Teams channels. |
| L13 | **Scheduled Report Emails** | Feature | Automatically email weekly/monthly reports to stakeholders. |
| L14 | **Campaign Budget Pacing** | Feature | Visualize daily budget pacing vs. actual spend with projections. |
| L15 | **Competitor Analysis** | Feature | Compare campaign performance against industry benchmarks (requires external data). |
| L16 | **Creative Asset Management** | Feature | Upload, organize, and A/B test ad creatives directly in the platform. |
| L17 | **Custom Dashboard Widgets** | Feature | Drag-and-drop dashboard builder with user-configurable widgets. |
| L18 | **Two-Factor Authentication** | Security | Add TOTP-based 2FA for account security. |
| L19 | **API Key Management** | Security | Generate and manage API keys for third-party integrations. |
| L20 | **SOC 2 / GDPR Compliance** | Compliance | Document data handling, retention policies, and user data export/deletion. |

---

## Summary Counts

| Priority | Count |
|----------|-------|
| Critical | 8 |
| High | 15 |
| Medium | 20 |
| Low | 20 |
| **Total** | **63** |

---

*Last updated: 2026-06-21*
*Next review: Before production deployment*
