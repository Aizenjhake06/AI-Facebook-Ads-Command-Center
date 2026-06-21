/**
 * Shared validation schemas using Zod.
 * Used across API routes and forms.
 */

import { z } from 'zod'

// ============================================
// Common Schemas
// ============================================
export const uuidSchema = z.string().uuid()
export const emailSchema = z.string().email()
export const slugSchema = z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')

// ============================================
// Workspace Schemas
// ============================================
export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: slugSchema,
})

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: slugSchema.optional(),
})

export const workspaceMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['owner', 'admin', 'member', 'viewer']),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
})

// ============================================
// Profile Schemas
// ============================================
export const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional(),
})

// ============================================
// Saved Views Schemas
// ============================================
export const createSavedViewSchema = z.object({
  name: z.string().min(1).max(100),
  view_type: z.enum(['campaigns', 'adsets', 'ads', 'analytics']),
  columns: z.array(z.string()).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
})

export const updateSavedViewSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  columns: z.array(z.string()).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
})

// ============================================
// Report Schemas
// ============================================
export const createReportSchema = z.object({
  workspace_id: uuidSchema,
  report_type: z.enum(['campaign_summary', 'performance', 'insights', 'health', 'recommendations', 'forecasts', 'alerts']),
  format: z.enum(['csv', 'excel', 'pdf']),
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  date_range_start: z.string().datetime().optional(),
  date_range_end: z.string().datetime().optional(),
})

// ============================================
// Alert Schemas
// ============================================
export const updateAlertSchema = z.object({
  status: z.enum(['active', 'resolved', 'dismissed']),
})

// ============================================
// Recommendation Schemas
// ============================================
export const updateRecommendationSchema = z.object({
  status: z.enum(['pending', 'applied', 'dismissed', 'expired']),
})

// ============================================
// Notification Preferences Schemas
// ============================================
export const updateNotificationPrefsSchema = z.object({
  email_enabled: z.boolean().optional(),
  alert_email: z.boolean().optional(),
  report_email: z.boolean().optional(),
  campaign_issue_email: z.boolean().optional(),
  digest_frequency: z.enum(['realtime', 'daily', 'weekly', 'none']).optional(),
  quiet_hours_start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  quiet_hours_end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
})

// ============================================
// Sync Schemas
// ============================================
export const triggerSyncSchema = z.object({
  connection_id: uuidSchema,
  ad_account_id: uuidSchema.optional(),
  entity_type: z.enum(['all', 'business_managers', 'ad_accounts', 'campaigns', 'adsets', 'ads', 'insights']),
  sync_type: z.enum(['full', 'incremental', 'manual', 'scheduled']),
  days_back: z.number().int().min(1).max(365).optional(),
})

// ============================================
// Meta Connection Schemas
// ============================================
export const createMetaConnectionSchema = z.object({
  workspace_id: uuidSchema,
})

// ============================================
// AI Chat Schemas
// ============================================
export const chatMessageSchema = z.object({
  message: z.string().min(1).max(2000),
})

// ============================================
// Query Param Schemas
// ============================================
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export const dateRangeSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const searchSchema = z.object({
  q: z.string().max(200).optional(),
  status: z.string().optional(),
})

// ============================================
// Chat Schemas
// ============================================
export const chatRequestSchema = z.object({
  query: z.string().min(1).max(2000),
  workspace_id: uuidSchema,
})

// ============================================
// View Schemas
// ============================================
export const createViewRequestSchema = z.object({
  workspace_id: uuidSchema,
  name: z.string().min(1).max(100),
  view_type: z.enum(['campaigns', 'adsets', 'ads', 'analytics']).default('campaigns'),
  columns: z.array(z.string()).default(['name', 'status', 'budget', 'spent', 'impressions', 'clicks', 'ctr', 'cpc', 'conversions']),
  filters: z.record(z.string(), z.unknown()).default({}),
  sort_by: z.string().default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
  is_default: z.boolean().default(false),
})

// ============================================
// Notification Schemas
// ============================================
export const createNotificationSchema = z.object({
  workspace_id: uuidSchema.optional(),
  type: z.enum(['alert', 'report_ready', 'campaign_issue', 'system']),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  data: z.record(z.string(), z.unknown()).optional(),
  channel: z.enum(['in_app', 'email', 'both']).default('in_app'),
})

export const notificationActionSchema = z.object({
  action: z.enum(['mark_read', 'mark_all_read', 'delete']),
  ids: z.array(uuidSchema).optional(),
})

// ============================================
// Alert Generation Schemas
// ============================================
export const generateAlertsSchema = z.object({
  workspace_id: uuidSchema,
  campaign_ids: z.array(uuidSchema).optional(),
  date_range: z.number().int().min(1).max(90).default(7),
})

// ============================================
// Input Sanitization
// ============================================
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }
  return input
    .replace(/[<>]/g, '') // Remove potential XSS chars
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim()
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value)
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(v => typeof v === 'string' ? sanitizeString(v) : v)
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized as T
}

export function validateWorkspaceId(workspaceId: string): string | null {
  const result = uuidSchema.safeParse(workspaceId)
  if (!result.success) {
    return 'Invalid workspace_id format'
  }
  return null
}

// ============================================
// Helper Functions
// ============================================
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(body)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

export function validateQuery<T>(schema: z.ZodSchema<T>, query: Record<string, string | string[] | undefined>): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(query)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

export function formatZodError(error: z.ZodError): string {
  return error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
}
