-- ============================================================================
-- BACKFILL: Add existing auth users to public.users table
-- ============================================================================
-- This migration ensures all existing authenticated users have a record
-- in the public.users table. Needed when users signed up before the
-- handle_new_user() trigger was created.
-- ============================================================================

-- Insert existing auth users into public.users table
INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ) as full_name,
  au.raw_user_meta_data->>'avatar_url' as avatar_url,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL  -- Only insert users that don't exist yet
ON CONFLICT (id) DO NOTHING;  -- Skip if already exists
