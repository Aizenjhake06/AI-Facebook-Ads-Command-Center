'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, TriangleAlert as AlertTriangle, FileCheck, Megaphone, Info, Check, Trash2, Settings, Loader as Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Notification } from '@/lib/notifications'
import { getNotificationIcon, getNotificationColor, formatNotificationTime } from '@/lib/notifications'

const iconMap: Record<string, any> = {
  AlertTriangle, FileCheck, Megaphone, Info,
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=20')
      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (e) {
      console.error('Failed to fetch notifications:', e)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
      setUnreadCount((prev) => Math.max(0, prev - ids.length))
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
      setUnreadCount(0)
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-400 hover:text-white transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => router.push('/notifications')}
                className="p-1 text-slate-500 hover:text-white"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const Icon = iconMap[getNotificationIcon(notification.type)] || Info
                const colorClass = getNotificationColor(notification.type)

                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-slate-700/20' : ''
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead([notification.id])
                      }
                    }}
                  >
                    <div className={`p-1.5 rounded ${colorClass.split(' ')[1] || 'bg-slate-700'}`}>
                      <Icon className={`w-4 h-4 ${colorClass.split(' ')[0] || 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{notification.title}</p>
                      <p className="text-xs text-slate-400 line-clamp-2">{notification.message}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatNotificationTime(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead([notification.id])
                          }}
                          className="p-1 text-slate-500 hover:text-blue-400"
                          title="Mark as read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notification.id)
                        }}
                        className="p-1 text-slate-500 hover:text-red-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-700 px-4 py-2">
            <button
              onClick={() => {
                setOpen(false)
                router.push('/notifications')
              }}
              className="text-xs text-blue-400 hover:text-blue-300 w-full text-center"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
