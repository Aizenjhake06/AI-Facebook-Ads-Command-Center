'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { ForecastPanel } from '@/components/analytics/ForecastPanel'
import { RefreshCw, ChartBar as BarChart3, Calendar, Info } from 'lucide-react'
import type { CampaignForecast } from '@/lib/forecasting'

const DATE_PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 60 days', days: 60 },
]

const PERIOD_OPTIONS = [
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
]

export default function ForecastsPage() {
  const { currentWorkspace } = useWorkspace()
  const [forecasts, setForecasts] = useState<CampaignForecast[]>([])
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(false)
  const [message, setMessage] = useState('')
  const [datePreset, setDatePreset] = useState(30)
  const [periodDays, setPeriodDays] = useState(14)
  const [generatedAt, setGeneratedAt] = useState<string>()

  const fetchForecasts = useCallback(async () => {
    if (!currentWorkspace) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        workspace_id: currentWorkspace.id,
        period_days: periodDays.toString(),
        ...(datePreset > 0 && {
          start_date: new Date(Date.now() - datePreset * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
        }),
      })

      const response = await fetch(`/api/forecasts?${params}`)
      const data = await response.json()

      setForecasts(data.forecasts || [])
      setHasData(data.hasData)
      setMessage(data.message || '')
      setGeneratedAt(data.generatedAt)
    } catch (error) {
      console.error('Error fetching forecasts:', error)
      setHasData(false)
      setMessage('Failed to load forecasts')
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace, datePreset, periodDays])

  useEffect(() => {
    fetchForecasts()
  }, [fetchForecasts])

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Performance Forecasts</h1>
          <p className="text-slate-400 mt-1">Predict future campaign performance using historical data</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm"
          >
            {DATE_PRESETS.map((preset) => (
              <option key={preset.days} value={preset.days}>
                History: {preset.label}
              </option>
            ))}
          </select>
          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.days} value={opt.days}>
                Forecast: {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={fetchForecasts}
            disabled={loading}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-slate-300">
              Forecasts use linear regression on historical daily metrics with exponential smoothing.
              Confidence intervals show the expected range with 95% confidence.
              More historical data improves forecast accuracy.
            </p>
          </div>
        </div>
      </div>

      {/* Forecasts */}
      <ForecastPanel
        forecasts={forecasts}
        loading={loading}
        hasData={hasData}
        message={message}
      />

      {generatedAt && (
        <div className="text-center text-xs text-slate-600 mt-6">
          Generated at {new Date(generatedAt).toLocaleString()}
        </div>
      )}
    </div>
  )
}
