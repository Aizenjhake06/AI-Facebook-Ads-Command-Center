-- ============================================================================
-- ADD TWO-FACTOR AUTHENTICATION SUPPORT
-- ============================================================================
-- This migration adds 2FA columns to the users table
-- ============================================================================

-- Add 2FA columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT,
ADD COLUMN IF NOT EXISTS backup_codes TEXT[];

-- Add comment
COMMENT ON COLUMN public.users.two_factor_enabled IS 'Whether 2FA is enabled for this user';
COMMENT ON COLUMN public.users.two_factor_secret IS 'TOTP secret for 2FA (encrypted)';
COMMENT ON COLUMN public.users.backup_codes IS 'Hashed backup codes for 2FA recovery';

-- Create index for 2FA lookups
CREATE INDEX IF NOT EXISTS idx_users_2fa_enabled ON public.users(two_factor_enabled) WHERE two_factor_enabled = TRUE;
