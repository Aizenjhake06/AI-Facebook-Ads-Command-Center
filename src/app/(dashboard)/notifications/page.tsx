'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, TriangleAlert as AlertTriangle, FileCheck, Megaphone, Info, Check, Trash2, Settings, Loader as Loader2, Mail, Clock, Save } from 'lucide-react'
import type { Notification, NotificationPreferences } from '@/lib/notifications'
import { getNotificationIcon, getNotificationColor, formatNotificationTime } from '@/lib/notifications'

const iconMap: Record<string, any> = {
  AlertTriangle, FileCheck, Megaphone, Info,
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [prefsLoading, setPrefsLoading] = useState(false)
  const [prefsSaved, setPrefsSaved] = useState(false)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const status = activeTab === 'unread' ? 'unread' : 'all'
      const response = await fetch(`/api/notifications?status=${status}&limit=100`)
      const data = await response.json()
      setNotifications(data.notifications || [])
    } catch (e) {
      console.error('Failed to fetch notifications:', e)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  const fetchPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/preferences')
      const data = await response.json()
      setPrefs(data.preferences)
    } catch (e) {
      console.error('Failed to fetch preferences:', e)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    fetchPreferences()
  }, [fetchNotifications, fetchPreferences])

  const markAsRead = async (ids: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read', ids }),
      })
      setNotifications((prev) =>
        prev.map((n) =>
          ids.includes(n.id) ? { ...n, read: true, readAt: new Date().toISOString() } : n
        )
      )
    } catch (e) {
      console.error('Failed to mark as read:', e)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      })
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
      )
    } catch (e) {
      console.error('Failed to mark all as read:', e)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', ids: [id] }),
      })
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    } catch (e) {
      console.error('Failed to delete notification:', e)
    }
  }

  const savePreferences = async () => {
    if (!prefs) return
    setPrefsLoading(true)
    setPrefsSaved(false)
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_enabled: prefs.emailEnabled,
          alert_email: prefs.alertEmail,
          report_email: prefs.reportEmail,
          campaign_issue_email: prefs.campaignIssueEmail,
          digest_frequency: prefs.digestFrequency,
          quiet_hours_start: prefs.quietHoursStart,
          quiet_hours_end: prefs.quietHoursEnd,
        }),
      })
      if (response.ok) {
        setPrefsSaved(true)
        setTimeout(() => setPrefsSaved(false), 3000)
      }
    } catch (e) {
      console.error('Failed to save preferences:', e)
    } finally {
      setPrefsLoading(false)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-slate-400 mt-1">Manage your notifications and preferences</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
          >
            <Check className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notifications List */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-700">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'unread'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* List */}
            <div className="divide-y divide-slate-700/50">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const Icon = iconMap[getNotificationIcon(notification.type)] || Info
                  const colorClass = getNotificationColor(notification.type)

                  return (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 px-4 py-4 hover:bg-slate-700/30 transition-colors ${
                        !notification.read ? 'bg-slate-700/10' : ''
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${colorClass.split(' ')[1] || 'bg-slate-700'}`}>
                        <Icon className={`w-5 h-5 ${colorClass.split(' ')[0] || 'text-slate-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white">{notification.title}</p>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mt-0.5">{notification.message}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatNotificationTime(notification.createdAt)}
                          </span>
                          {notification.deliveryStatus === 'failed' && (
                            <span className="text-xs text-red-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Delivery failed
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead([notification.id])}
                            className="p-1.5 text-slate-500 hover:text-blue-400 transition-colors"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-white">Preferences</h2>
            </div>

            {prefs ? (
              <div className="space-y-4">
                {/* Email Master Toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-300">Email Notifications</span>
                  <input
                    type="checkbox"
                    checked={prefs.emailEnabled}
                    onChange={(e) => setPrefs({ ...prefs, emailEnabled: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500"
                  />
                </label>

                {prefs.emailEnabled && (
                  <div className="space-y-3 pl-4 border-l-2 border-slate-700">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-slate-400">Alert emails</span>
                      <input
                        type="checkbox"
                        checked={prefs.alertEmail}
                        onChange={(e) => setPrefs({ ...prefs, alertEmail: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-slate-400">Report ready emails</span>
                      <input
                        type="checkbox"
                        checked={prefs.reportEmail}
                        onChange={(e) => setPrefs({ ...prefs, reportEmail: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-slate-400">Campaign issue emails</span>
                      <input
                        type="checkbox"
                        checked={prefs.campaignIssueEmail}
                        onChange={(e) => setPrefs({ ...prefs, campaignIssueEmail: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500"
                      />
                    </label>
                  </div>
                )}

                {/* Digest Frequency */}
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Digest Frequency</label>
                  <select
                    value={prefs.digestFrequency}
                    onChange={(e) => setPrefs({ ...prefs, digestFrequency: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="realtime">Real-time</option>
                    <option value="daily">Daily digest</option>
                    <option value="weekly">Weekly digest</option>
                    <option value="none">No digest</option>
                  </select>
                </div>

                {/* Quiet Hours */}
                <div>
                  <label className="block text-sm text-slate-300 mb-2">Quiet Hours</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={prefs.quietHoursStart || ''}
                      onChange={(e) => setPrefs({ ...prefs, quietHoursStart: e.target.value || undefined })}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                    <span className="text-slate-500">to</span>
                    <input
                      type="time"
                      value={prefs.quietHoursEnd || ''}
                      onChange={(e) => setPrefs({ ...prefs, quietHoursEnd: e.target.value || undefined })}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={savePreferences}
                  disabled={prefsLoading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white text-sm py-2.5 rounded-lg transition-colors"
                >
                  {prefsLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : prefsSaved ? (
                    <>
                      <Check className="w-4 h-4" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Preferences
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
