-- ============================================================================
-- FIX RLS POLICIES FOR META CAMPAIGNS/AD SETS/ADS
-- Run this if campaigns are not being saved despite sync showing "309 campaigns"
-- ============================================================================

-- First, let's check current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('meta_campaigns', 'meta_ad_sets', 'meta_ads')
ORDER BY tablename, policyname;

-- ============================================================================
-- OPTION 1: TEMPORARILY DISABLE RLS FOR TESTING
-- ============================================================================
-- Run this to test if RLS is the problem
-- WARNING: This removes security checks - only for testing!

-- ALTER TABLE meta_campaigns DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE meta_ad_sets DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE meta_ads DISABLE ROW LEVEL SECURITY;

-- Then try syncing again. If it works, RLS policies need to be fixed.

-- ============================================================================
-- OPTION 2: ADD PROPER INSERT POLICIES
-- ============================================================================
-- If campaigns/ad sets/ads tables don't have INSERT policies, add them

-- Check if user has access to the workspace
CREATE OR REPLACE FUNCTION public.has_workspace_access(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.workspace_members 
    WHERE workspace_id = workspace_uuid 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Campaigns INSERT policy
DROP POLICY IF EXISTS "insert_campaign_as_member" ON public.meta_campaigns;
CREATE POLICY "insert_campaign_as_member" ON public.meta_campaigns FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meta_connections mc
      WHERE mc.id = meta_connection_id
      AND has_workspace_access(mc.workspace_id)
    )
  );

-- Campaigns SELECT policy  
DROP POLICY IF EXISTS "select_campaign_as_member" ON public.meta_campaigns;
CREATE POLICY "select_campaign_as_member" ON public.meta_campaigns FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.meta_connections mc
      WHERE mc.id = meta_connection_id
      AND has_workspace_access(mc.workspace_id)
    )
  );

-- Campaigns UPDATE policy
DROP POLICY IF EXISTS "update_campaign_as_member" ON public.meta_campaigns;
CREATE POLICY "update_campaign_as_member" ON public.meta_campaigns FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.meta_connections mc
      WHERE mc.id = meta_connection_id
      AND has_workspace_access(mc.workspace_id)
    )
  );

-- Ad Sets INSERT policy
DROP POLICY IF EXISTS "insert_adset_as_member" ON public.meta_ad_sets;
CREATE POLICY "insert_adset_as_member" ON public.meta_ad_sets FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meta_connections mc
      WHERE mc.id = meta_connection_id
      AND has_workspace_access(mc.workspace_id)
    )
  );

-- Ad Sets SELECT policy
DROP POLICY IF EXISTS "select_adset_as_member" ON public.meta_ad_sets;
CREATE POLICY "select_adset_as_member" ON public.meta_ad_sets FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.meta_connections mc
      WHERE mc.id = meta_connection_id
      AND has_workspace_access(mc.workspace_id)
    )
  );

-- Ad Sets UPDATE policy
DROP POLICY IF EXISTS "update_adset_as_member" ON public.meta_ad_sets;
CREATE POLICY "update_adset_as_member" ON public.meta_ad_sets FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.meta_connections mc
      WHERE mc.id = meta_connection_id
      AND has_workspace_access(mc.workspace_id)
    )
  );

-- Ads INSERT policy
DROP POLICY IF EXISTS "insert_ad_as_member" ON public.meta_ads;
CREATE POLICY "insert_ad_as_member" ON public.meta_ads FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meta_connections mc
      WHERE mc.id = meta_connection_id
      AND has_workspace_access(mc.workspace_id)
    )
  );

-- Ads SELECT policy
DROP POLICY IF EXISTS "select_ad_as_member" ON public.meta_ads;
CREATE POLICY "select_ad_as_member" ON public.meta_ads FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.meta_connections mc
      WHERE mc.id = meta_connection_id
      AND has_workspace_access(mc.workspace_id)
    )
  );

-- Ads UPDATE policy
DROP POLICY IF EXISTS "update_ad_as_member" ON public.meta_ads;
CREATE POLICY "update_ad_as_member" ON public.meta_ads FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.meta_connections mc
      WHERE mc.id = meta_connection_id
      AND has_workspace_access(mc.workspace_id)
    )
  );

-- ============================================================================
-- RE-ENABLE RLS IF YOU DISABLED IT FOR TESTING
-- ============================================================================

-- ALTER TABLE meta_campaigns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE meta_ad_sets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE meta_ads ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if policies exist now
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('meta_campaigns', 'meta_ad_sets', 'meta_ads')
ORDER BY tablename, cmd;

-- Test if you can see your data
SELECT COUNT(*) as campaign_count FROM meta_campaigns;
SELECT COUNT(*) as adset_count FROM meta_ad_sets;
SELECT COUNT(*) as ad_count FROM meta_ads;
