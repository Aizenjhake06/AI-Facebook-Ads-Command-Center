/*
# Set up pg_cron for weekly Meta token refresh

1. Extensions
- Enable pg_cron extension for scheduled jobs
- pg_net is already enabled for HTTP calls

2. Function
- Create `refresh_meta_tokens()` function that calls the meta-refresh edge function via pg_net
- Uses SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment

3. Cron Schedule
- Schedule weekly execution every Monday at 2 AM UTC
- Job name: 'refresh-meta-tokens-weekly'

4. Notes
- pg_cron jobs run as the postgres user with database-level permissions
- The edge function handles the actual token refresh logic
- Tokens expiring within 7 days are refreshed proactively
*/;

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create function to call the meta-refresh edge function
CREATE OR REPLACE FUNCTION public.refresh_meta_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  -- Get Supabase URL and service key from environment
  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE NOTICE 'Supabase settings not configured - skip automated refresh';
    RETURN;
  END IF;
  
  -- Use pg_net to make async HTTP request to meta-refresh edge function
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/meta-refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
END;
$$;

-- Schedule the cron job: every Monday at 2 AM UTC
-- First remove any existing job with same name
SELECT cron.unschedule('refresh-meta-tokens-weekly') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh-meta-tokens-weekly'
);

-- Create the scheduled job
SELECT cron.schedule(
  'refresh-meta-tokens-weekly',
  '0 2 * * 1',
  'SELECT public.refresh_meta_tokens();'
);

-- Add comments
COMMENT ON FUNCTION public.refresh_meta_tokens() IS 'Calls the meta-refresh edge function to proactively refresh Meta OAuth tokens that expire within 7 days. Scheduled via pg_cron to run weekly.';

COMMENT ON TABLE public.meta_connections IS 'Meta OAuth connections. Tokens expire after ~60 days. A pg_cron job calls the meta-refresh edge function weekly to refresh tokens before expiry.';