/*
# Phase 13 & 14: Reports, Exports, and Notifications Tables

1. New Tables
- `campaign_reports`: Stores generated report metadata
  - `id` (uuid, primary key)
  - `workspace_id` (uuid, FK to workspaces)
  - `user_id` (uuid, FK to auth.users)
  - `report_type` (text: campaign_summary, performance, insights, health, recommendations, forecasts, alerts)
  - `format` (text: csv, excel, pdf)
  - `title` (text)
  - `description` (text)
  - `filters` (jsonb - date range, campaigns, metrics)
  - `file_url` (text - storage URL)
  - `file_size` (integer - bytes)
  - `status` (text: pending, generating, completed, failed)
  - `error_message` (text)
  - `generated_at`, `expires_at` (timestamptz)
  - `created_at`, `updated_at` (timestamptz)

- `shareable_reports`: Stores public share links
  - `id` (uuid, primary key)
  - `report_id` (uuid, FK to campaign_reports)
  - `token` (text, unique - public access token)
  - `password_hash` (text - optional password protection)
  - `expires_at` (timestamptz)
  - `access_count` (integer)
  - `last_accessed_at` (timestamptz)
  - `created_at` (timestamptz)

- `user_notifications`: Stores notification records
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to auth.users)
  - `workspace_id` (uuid, FK to workspaces)
  - `type` (text: alert, report_ready, campaign_issue, system)
  - `title` (text)
  - `message` (text)
  - `data` (jsonb - related entity IDs, links)
  - `channel` (text: in_app, email, both)
  - `read` (boolean)
  - `read_at` (timestamptz)
  - `email_sent` (boolean)
  - `email_sent_at` (timestamptz)
  - `delivery_status` (text: pending, sent, delivered, failed)
  - `delivery_error` (text)
  - `created_at` (timestamptz)

- `notification_preferences`: Stores per-user notification settings
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to auth.users, unique)
  - `email_enabled` (boolean)
  - `alert_email` (boolean)
  - `report_email` (boolean)
  - `campaign_issue_email` (boolean)
  - `digest_frequency` (text: realtime, daily, weekly, none)
  - `quiet_hours_start` (time)
  - `quiet_hours_end` (time)
  - `created_at`, `updated_at` (timestamptz)

2. Security
- Enable RLS on all tables.
- Workspace-member and owner-scoped policies.
*/

-- Campaign Reports table
CREATE TABLE IF NOT EXISTS campaign_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  report_type TEXT NOT NULL CHECK (report_type IN ('campaign_summary', 'performance', 'insights', 'health', 'recommendations', 'forecasts', 'alerts')),
  format TEXT NOT NULL CHECK (format IN ('csv', 'excel', 'pdf')),
  title TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}',

  file_url TEXT,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,

  generated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shareable Reports table
CREATE TABLE IF NOT EXISTS shareable_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES campaign_reports(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  access_count INTEGER NOT NULL DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('alert', 'report_ready', 'campaign_issue', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'both')),

  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,

  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
  delivery_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  email_enabled BOOLEAN NOT NULL DEFAULT true,
  alert_email BOOLEAN NOT NULL DEFAULT true,
  report_email BOOLEAN NOT NULL DEFAULT true,
  campaign_issue_email BOOLEAN NOT NULL DEFAULT true,
  digest_frequency TEXT NOT NULL DEFAULT 'realtime' CHECK (digest_frequency IN ('realtime', 'daily', 'weekly', 'none')),
  quiet_hours_start TIME,
  quiet_hours_end TIME,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_reports_workspace ON campaign_reports(workspace_id);
CREATE INDEX IF NOT EXISTS idx_campaign_reports_user ON campaign_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_reports_status ON campaign_reports(status);
CREATE INDEX IF NOT EXISTS idx_campaign_reports_created ON campaign_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shareable_reports_token ON shareable_reports(token);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_workspace ON user_notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created ON user_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(type);

-- Enable RLS
ALTER TABLE campaign_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE shareable_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for campaign_reports
DROP POLICY IF EXISTS "select_own_reports" ON campaign_reports;
CREATE POLICY "select_own_reports" ON campaign_reports FOR SELECT
  TO authenticated USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = campaign_reports.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_reports" ON campaign_reports;
CREATE POLICY "insert_own_reports" ON campaign_reports FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_reports" ON campaign_reports;
CREATE POLICY "delete_own_reports" ON campaign_reports FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- RLS Policies for shareable_reports (via report ownership)
DROP POLICY IF EXISTS "select_shareable_via_report" ON shareable_reports;
CREATE POLICY "select_shareable_via_report" ON shareable_reports FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM campaign_reports cr
      WHERE cr.id = shareable_reports.report_id
      AND (cr.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = cr.workspace_id AND wm.user_id = auth.uid()
      ))
    )
  );

DROP POLICY IF EXISTS "insert_shareable_via_report" ON shareable_reports;
CREATE POLICY "insert_shareable_via_report" ON shareable_reports FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaign_reports cr
      WHERE cr.id = shareable_reports.report_id
      AND cr.user_id = auth.uid()
    )
  );

-- RLS Policies for user_notifications
DROP POLICY IF EXISTS "select_own_notifications" ON user_notifications;
CREATE POLICY "select_own_notifications" ON user_notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_notifications" ON user_notifications;
CREATE POLICY "insert_own_notifications" ON user_notifications FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_notifications" ON user_notifications;
CREATE POLICY "update_own_notifications" ON user_notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_notifications" ON user_notifications;
CREATE POLICY "delete_own_notifications" ON user_notifications FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- RLS Policies for notification_preferences
DROP POLICY IF EXISTS "select_own_prefs" ON notification_preferences;
CREATE POLICY "select_own_prefs" ON notification_preferences FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "insert_own_prefs" ON notification_preferences;
CREATE POLICY "insert_own_prefs" ON notification_preferences FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_prefs" ON notification_preferences;
CREATE POLICY "update_own_prefs" ON notification_preferences FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Updated_at triggers
CREATE TRIGGER update_campaign_reports_updated_at
  BEFORE UPDATE ON campaign_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
