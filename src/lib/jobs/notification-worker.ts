/**
 * Notification Worker - Sends email notifications
 */

import { Job } from 'bull'
import { notificationQueue } from './queue'
import { createClient } from '@supabase/supabase-js'
import { logger } from '../logger'
import { sendEmail } from '../email/mailer'
import { renderAlertEmail, renderReportEmail, renderDigestEmail } from '../email/templates'
import type { AlertEmailData, ReportEmailData, DigestEmailData } from '../email/templates'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface EmailNotificationJobData {
  notificationId: string
  userId: string
  workspaceId: string
  type: 'alert' | 'report_ready' | 'digest' | 'general'
  data: any
}

/**
 * Process email notification jobs
 */
notificationQueue.process('send-email', async (job: Job<EmailNotificationJobData>) => {
  const { notificationId, userId, type, data } = job.data

  logger.info('Email notification processing started', { notificationId, type })

  try {
    // Get user email and preferences
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      throw new Error('User not found')
    }

    // Check notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Check if email notifications are enabled
    if (prefs && !prefs.email_enabled) {
      logger.info('Email notifications disabled for user', { userId })
      return { skipped: true, reason: 'email_disabled' }
    }

    // Check quiet hours
    if (prefs?.quiet_hours_enabled && prefs.quiet_hours_start && prefs.quiet_hours_end) {
      const now = new Date()
      const currentHour = now.getHours()
      const quietStart = parseInt(prefs.quiet_hours_start.split(':')[0])
      const quietEnd = parseInt(prefs.quiet_hours_end.split(':')[0])

      const isQuietTime =
        quietStart < quietEnd
          ? currentHour >= quietStart && currentHour < quietEnd
          : currentHour >= quietStart || currentHour < quietEnd

      if (isQuietTime) {
        logger.info('Skipping email during quiet hours', { userId, currentHour })
        return { skipped: true, reason: 'quiet_hours' }
      }
    }

    // Generate email based on type
    let subject: string
    let html: string

    switch (type) {
      case 'alert':
        const alertData: AlertEmailData = {
          campaignName: data.campaignName,
          alertType: data.alertType,
          message: data.message,
          severity: data.severity,
          currentValue: data.currentValue,
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        }
        subject = `⚠️ Campaign Alert: ${data.alertType.replace(/_/g, ' ')}`
        html = renderAlertEmail(alertData)
        break

      case 'report_ready':
        const reportData: ReportEmailData = {
          reportType: data.reportType,
          dateRange: data.dateRange,
          downloadUrl: `${process.env.NEXT_PUBLIC_APP_URL}${data.downloadUrl}`,
          fileSize: formatFileSize(data.fileSize),
          expiresAt: new Date(data.expiresAt).toLocaleDateString(),
        }
        subject = '📊 Your Report is Ready'
        html = renderReportEmail(reportData)
        break

      case 'digest':
        const digestData: DigestEmailData = data
        subject = `📈 ${data.period} Performance Digest`
        html = renderDigestEmail(digestData)
        break

      case 'general':
      default:
        subject = data.subject || 'Notification from AdPilot AI'
        html = data.html || data.message
        break
    }

    // Send email
    const sent = await sendEmail({
      to: user.email,
      subject,
      html,
      text: data.text || stripHtml(html),
    })

    if (sent) {
      // Update notification as sent
      if (notificationId) {
        await supabase
          .from('user_notifications')
          .update({
            sent_at: new Date().toISOString(),
            channel: 'email',
          })
          .eq('id', notificationId)
      }

      logger.info('Email notification sent successfully', {
        notificationId,
        userId,
        type,
        to: user.email,
      })

      return { sent: true, to: user.email }
    } else {
      throw new Error('Email sending failed')
    }
  } catch (error) {
    logger.error('Email notification failed', error, { notificationId, userId, type })
    throw error
  }
})

/**
 * Helper: Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

/**
 * Helper: Strip HTML tags for plain text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*<\/style>/gm, '')
    .replace(/<script[^>]*>.*<\/script>/gm, '')
    .replace(/<[^>]+>/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Event listeners
notificationQueue.on('completed', (job, result) => {
  logger.info('Notification job completed', { jobId: job.id, result })
})

notificationQueue.on('failed', (job, err) => {
  logger.error('Notification job failed', err, { jobId: job?.id })
})

console.log('[Notification Worker] Started and ready to send notifications')
