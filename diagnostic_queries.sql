-- ============================================================================
-- DIAGNOSTIC QUERIES FOR META ADS SYNC
-- Run these in Supabase SQL Editor to check sync status
-- ============================================================================

-- 1. CHECK META CONNECTIONS
-- Should show your connected Facebook account
SELECT 
  id,
  facebook_user_name,
  facebook_user_email,
  status,
  last_synced_at,
  created_at
FROM meta_connections
ORDER BY created_at DESC;

-- 2. CHECK AD ACCOUNTS
-- Should show all synced ad accounts
SELECT 
  id,
  name,
  ad_account_id,
  account_status,
  currency,
  amount_spent,
  is_active,
  last_synced_at
FROM meta_ad_accounts
ORDER BY last_synced_at DESC;

-- 3. COUNT CAMPAIGNS, AD SETS, AND ADS
-- Shows how many of each entity you have
SELECT 
  'Campaigns' as entity_type,
  COUNT(*) as count
FROM meta_campaigns
UNION ALL
SELECT 
  'Ad Sets' as entity_type,
  COUNT(*) as count
FROM meta_ad_sets
UNION ALL
SELECT 
  'Ads' as entity_type,
  COUNT(*) as count
FROM meta_ads;

-- 4. CHECK CAMPAIGNS (if any exist)
SELECT 
  c.id,
  c.name,
  c.campaign_id,
  c.status,
  c.effective_status,
  c.objective,
  c.daily_budget,
  c.lifetime_budget,
  a.name as ad_account_name,
  c.last_synced_at
FROM meta_campaigns c
JOIN meta_ad_accounts a ON c.ad_account_id = a.id
ORDER BY c.last_synced_at DESC
LIMIT 10;

-- 5. CHECK AD SETS (if any exist)
SELECT 
  ads.id,
  ads.name,
  ads.adset_id,
  ads.status,
  ads.effective_status,
  c.name as campaign_name,
  a.name as ad_account_name,
  ads.last_synced_at
FROM meta_ad_sets ads
JOIN meta_campaigns c ON ads.campaign_id = c.id
JOIN meta_ad_accounts a ON ads.ad_account_id = a.id
ORDER BY ads.last_synced_at DESC
LIMIT 10;

-- 6. CHECK ADS (if any exist)
SELECT 
  ad.id,
  ad.name,
  ad.ad_id,
  ad.status,
  ad.effective_status,
  c.name as campaign_name,
  a.name as ad_account_name,
  ad.last_synced_at
FROM meta_ads ad
JOIN meta_campaigns c ON ad.campaign_id = c.id
JOIN meta_ad_accounts a ON ad.ad_account_id = a.id
ORDER BY ad.last_synced_at DESC
LIMIT 10;

-- 7. CHECK SYNC LOGS
-- Shows recent sync attempts and their results
SELECT 
  id,
  sync_type,
  entity_type,
  status,
  total_records,
  processed_records,
  failed_records,
  duration_seconds,
  error_message,
  started_at,
  completed_at
FROM meta_sync_logs
ORDER BY created_at DESC
LIMIT 10;

-- 8. CHECK SYNC STATE
-- Shows last successful sync time for each entity type
SELECT 
  entity_type,
  last_sync_at,
  last_successful_sync_at,
  error_count
FROM meta_sync_state
ORDER BY entity_type;

-- 9. DETAILED AD ACCOUNT STATUS
-- Shows which accounts have data and which are empty
SELECT 
  a.name as ad_account_name,
  a.ad_account_id,
  a.account_status,
  a.is_active,
  (SELECT COUNT(*) FROM meta_campaigns WHERE ad_account_id = a.id) as campaigns,
  (SELECT COUNT(*) FROM meta_ad_sets WHERE ad_account_id = a.id) as ad_sets,
  (SELECT COUNT(*) FROM meta_ads WHERE ad_account_id = a.id) as ads,
  a.last_synced_at
FROM meta_ad_accounts a
ORDER BY a.last_synced_at DESC;

-- 10. FIND ACTIVE CAMPAIGNS
-- Lists campaigns that are currently active/running
SELECT 
  c.name,
  c.campaign_id,
  c.status,
  c.effective_status,
  c.objective,
  c.daily_budget,
  a.name as ad_account_name
FROM meta_campaigns c
JOIN meta_ad_accounts a ON c.ad_account_id = a.id
WHERE c.effective_status IN ('ACTIVE', 'PAUSED')
ORDER BY c.last_synced_at DESC;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================
-- 
-- If sync is working but no data:
-- - Query 1: Shows your Facebook account connection ✅
-- - Query 2: Shows 10+ ad accounts ✅
-- - Query 3: Shows 0 campaigns, 0 ad sets, 0 ads ❌ (This is the issue)
-- - Query 7: Shows completed syncs with 0 processed_records
-- - Query 9: Shows all ad accounts have 0 campaigns/ad sets/ads
--
-- This confirms: Ad accounts are synced but they're EMPTY in Facebook.
-- Solution: Create campaigns in Facebook Ads Manager first.
--
-- ============================================================================
