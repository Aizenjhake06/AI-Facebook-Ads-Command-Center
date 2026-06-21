'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { RecommendationsPanel } from '@/components/analytics/RecommendationsPanel'
import { RefreshCw, Sparkles, Calendar } from 'lucide-react'
import type { CampaignRecommendation } from '@/lib/recommendations'

const DATE_PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 14 days', days: 14 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 60 days', days: 60 },
]

export default function RecommendationsPage() {
  const { currentWorkspace } = useWorkspace()
  const [recommendations, setRecommendations] = useState<CampaignRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [hasData, setHasData] = useState(false)
  const [message, setMessage] = useState('')
  const [datePreset, setDatePreset] = useState(30)
  const [generatedAt, setGeneratedAt] = useState<string>()

  const fetchRecommendations = useCallback(async () => {
    if (!currentWorkspace) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        workspace_id: currentWorkspace.id,
        ...(datePreset > 0 && {
          start_date: new Date(Date.now() - datePreset * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
        }),
      })

      const response = await fetch(`/api/recommendations?${params}`)
      const data = await response.json()

      setRecommendations(data.recommendations || [])
      setHasData(data.hasData)
      setMessage(data.message || '')
      setGeneratedAt(data.generatedAt)
    } catch (error) {
      console.error('Error fetching recommendations:', error)
      setHasData(false)
      setMessage('Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }, [currentWorkspace, datePreset])

  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  const handleApply = (id: string) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== id))
  }

  const handleDismiss = (id: string) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Scaling Recommendations</h1>
          <p className="text-slate-400 mt-1">AI-powered campaign optimization actions</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-sm"
          >
            {DATE_PRESETS.map((preset) => (
              <option key={preset.days} value={preset.days}>
                {preset.label}
              </option>
            ))}
          </select>
          <button
            onClick={fetchRecommendations}
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
          <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-slate-300">
              Recommendations are generated based on campaign metrics including ROAS, CTR, CPA, frequency, and conversion rate.
              Each recommendation includes a confidence score and detailed reasoning.
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <RecommendationsPanel
        recommendations={recommendations}
        loading={loading}
        hasData={hasData}
        message={message}
        onApply={handleApply}
        onDismiss={handleDismiss}
      />

      {generatedAt && (
        <div className="text-center text-xs text-slate-600 mt-6">
          Generated at {new Date(generatedAt).toLocaleString()}
        </div>
      )}
    </div>
  )
}
