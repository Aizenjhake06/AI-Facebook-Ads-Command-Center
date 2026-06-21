export type NotificationType = 'alert' | 'report_ready' | 'campaign_issue' | 'system'
export type NotificationChannel = 'in_app' | 'email' | 'both'
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed'

export interface Notification {
  id: string
  userId: string
  workspaceId?: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  channel: NotificationChannel
  read: boolean
  readAt?: string
  emailSent: boolean
  emailSentAt?: string
  deliveryStatus: DeliveryStatus
  deliveryError?: string
  createdAt: string
}

export interface NotificationPreferences {
  id: string
  userId: string
  emailEnabled: boolean
  alertEmail: boolean
  reportEmail: boolean
  campaignIssueEmail: boolean
  digestFrequency: 'realtime' | 'daily' | 'weekly' | 'none'
  quietHoursStart?: string
  quietHoursEnd?: string
}

export function shouldSendEmail(
  prefs: NotificationPreferences | null,
  type: NotificationType
): boolean {
  if (!prefs || !prefs.emailEnabled) return false

  // Check quiet hours
  if (prefs.quietHoursStart && prefs.quietHoursEnd) {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:00`
    if (prefs.quietHoursStart <= currentTime && currentTime <= prefs.quietHoursEnd) {
      return false
    }
  }

  switch (type) {
    case 'alert':
      return prefs.alertEmail
    case 'report_ready':
      return prefs.reportEmail
    case 'campaign_issue':
      return prefs.campaignIssueEmail
    default:
      return prefs.emailEnabled
  }
}

export function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    alert: 'AlertTriangle',
    report_ready: 'FileCheck',
    campaign_issue: 'Megaphone',
    system: 'Info',
  }
  return icons[type]
}

export function getNotificationColor(type: NotificationType): string {
  const colors: Record<NotificationType, string> = {
    alert: 'text-red-400 bg-red-400/10 border-red-400/30',
    report_ready: 'text-green-400 bg-green-400/10 border-green-400/30',
    campaign_issue: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    system: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  }
  return colors[type]
}

export function formatNotificationTime(date: string): string {
  const now = new Date()
  const notifDate = new Date(date)
  const diffMs = now.getTime() - notifDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return notifDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
