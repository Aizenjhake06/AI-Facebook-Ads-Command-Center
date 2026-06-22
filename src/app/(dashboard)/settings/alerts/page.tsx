'use client'

import { useState, useEffect } from 'react'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { Bell, Mail, Smartphone, TrendingUp, TrendingDown, AlertTriangle, DollarSign } from 'lucide-react'

export default function AlertsPage() {
  const { currentWorkspace, membership } = useWorkspace()
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState({
    email_enabled: true,
    push_enabled: false,
    alert_performance_drop: true,
    alert_budget_threshold: true,
    alert_campaign_ended: true,
    budget_threshold_percent: 80,
  })

  const canManage = membership?.role === 'owner' || membership?.role === 'admin'

  const handleSave = async () => {
    setLoading(true)
    try {
      // TODO: Save preferences to API
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Alert preferences saved successfully!')
    } catch (error) {
      alert('Failed to save preferences')
    } finally {
      setLoading(false)
    }
  }

  if (!canManage) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 px-4 py-3 rounded-lg">
          Only workspace owners and admins can manage alert settings.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Alerts & Notifications</h1>
        <p className="text-slate-400 mt-1">
          Configure how and when you want to be notified about important events.
        </p>
      </div>

      <div className="space-y-6">
        {/* Notification Channels */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-medium text-white mb-4">Notification Channels</h2>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium">Email Notifications</p>
                  <p className="text-sm text-slate-400">Receive alerts via email</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.email_enabled}
                onChange={(e) => setPreferences({ ...preferences, email_enabled: e.target.checked })}
                className="w-5 h-5 rounded bg-slate-700 border-slate-600"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-white font-medium">Push Notifications</p>
                  <p className="text-sm text-slate-400">Get instant browser alerts</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.push_enabled}
                onChange={(e) => setPreferences({ ...preferences, push_enabled: e.target.checked })}
                className="w-5 h-5 rounded bg-slate-700 border-slate-600"
              />
            </label>
          </div>
        </div>

        {/* Alert Types */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
          <h2 className="text-lg font-medium text-white mb-4">Alert Types</h2>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-white font-medium">Performance Drop</p>
                  <p className="text-sm text-slate-400">Alert when campaign performance drops significantly</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.alert_performance_drop}
                onChange={(e) => setPreferences({ ...preferences, alert_performance_drop: e.target.checked })}
                className="w-5 h-5 rounded bg-slate-700 border-slate-600"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors">
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-white font-medium">Budget Threshold</p>
                  <p className="text-sm text-slate-400">Alert when budget reaches threshold</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.alert_budget_threshold}
                onChange={(e) => setPreferences({ ...preferences, alert_budget_threshold: e.target.checked })}
                className="w-5 h-5 rounded bg-slate-700 border-slate-600"
              />
            </label>

            {preferences.alert_budget_threshold && (
              <div className="ml-12 p-4 bg-slate-900/50 rounded-lg">
                <label className="block">
                  <span className="text-sm text-slate-300 mb-2 block">Budget Threshold (%)</span>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={preferences.budget_threshold_percent}
                    onChange={(e) => setPreferences({ ...preferences, budget_threshold_percent: parseInt(e.target.value) })}
                    className="w-32 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                </label>
              </div>
            )}

            <label className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg cursor-pointer hover:bg-slate-900 transition-colors">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-white font-medium">Campaign Ended</p>
                  <p className="text-sm text-slate-400">Alert when campaigns reach their end date</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.alert_campaign_ended}
                onChange={(e) => setPreferences({ ...preferences, alert_campaign_ended: e.target.checked })}
                className="w-5 h-5 rounded bg-slate-700 border-slate-600"
              />
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}
