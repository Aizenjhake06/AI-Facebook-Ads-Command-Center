'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Pause, Copy, RefreshCw, Users, Check, X, ChevronDown, ChevronUp, CircleAlert as AlertCircle, Sparkles, DollarSign, Target, MousePointerClick, Eye, ChartBar as BarChart3 } from 'lucide-react'
import type { CampaignRecommendation, RecommendationAction } from '@/lib/recommendations'
import { getActionLabel, getActionColor, getActionIcon } from '@/lib/recommendations'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters'

interface RecommendationsPanelProps {
  recommendations: CampaignRecommendation[]
  loading?: boolean
  hasData?: boolean
  message?: string
  onApply?: (id: string) => void
  onDismiss?: (id: string) => void
}

const actionIcons: Record<string, any> = {
  TrendingUp,
  TrendingDown,
  Pause,
  Copy,
  RefreshCw,
  Users,
}

function ConfidenceBar({ score }: { score: number }) {
  const color = score >= 0.8 ? 'bg-emerald-500' : score >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${score * 100}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-10 text-right">{Math.round(score * 100)}%</span>
    </div>
  )
}

function MetricBadge({ label, value, format }: { label: string; value: number | null; format: 'currency' | 'percent' | 'number' | 'ratio' }) {
  const formatted = value === null ? 'N/A' :
    format === 'currency' ? formatCurrency(value) :
    format === 'percent' ? formatPercent(value) :
    format === 'ratio' ? `${value.toFixed(2)}x` :
    formatNumber(value)

  return (
    <div className="bg-slate-900/50 rounded px-2 py-1 text-xs">
      <span className="text-slate-500">{label}:</span>{' '}
      <span className="text-slate-300">{formatted}</span>
    </div>
  )
}

function RecommendationCard({
  recommendation,
  onApply,
  onDismiss
}: {
  recommendation: CampaignRecommendation
  onApply?: (id: string) => void
  onDismiss?: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [processing, setProcessing] = useState(false)

  const Icon = actionIcons[getActionIcon(recommendation.actionType)] || AlertCircle
  const colorClass = getActionColor(recommendation.actionType)

  const handleAction = async (action: 'apply' | 'dismiss') => {
    setProcessing(true)
    try {
      const response = await fetch(`/api/recommendations/${recommendation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'apply' ? 'applied' : 'dismissed' }),
      })
      if (response.ok) {
        if (action === 'apply') onApply?.(recommendation.id)
        else onDismiss?.(recommendation.id)
      }
    } catch (e) {
      console.error('Failed to update recommendation:', e)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className={`rounded-lg border p-4 ${colorClass.replace('text-', 'border-').split(' ')[1] || 'border-slate-700'} bg-slate-800/30`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${colorClass.split(' ')[1] || 'bg-slate-700'}`}>
            <Icon className={`w-5 h-5 ${colorClass.split(' ')[0] || 'text-slate-400'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-semibold ${colorClass.split(' ')[0] || 'text-slate-300'}`}>
                {getActionLabel(recommendation.actionType)}
              </span>
              <span className="text-xs text-slate-500">for</span>
              <span className="text-sm text-white truncate max-w-[200px]">{recommendation.campaignName}</span>
            </div>
            <div className="mt-2">
              <ConfidenceBar score={recommendation.confidenceScore} />
            </div>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 text-slate-500 hover:text-white transition-colors ml-2"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">{recommendation.reasoning}</p>

          {/* Current Metrics */}
          <div>
            <h4 className="text-xs font-medium text-slate-500 mb-2">Current Metrics</h4>
            <div className="flex flex-wrap gap-2">
              <MetricBadge label="ROAS" value={recommendation.currentMetrics.roas as number | null} format="ratio" />
              <MetricBadge label="CPA" value={recommendation.currentMetrics.cpa as number | null} format="currency" />
              <MetricBadge label="CTR" value={recommendation.currentMetrics.ctr as number | null} format="percent" />
              <MetricBadge label="Spend" value={recommendation.currentMetrics.spend as number | null} format="currency" />
              <MetricBadge label="Conv." value={recommendation.currentMetrics.conversions as number | null} format="number" />
            </div>
          </div>

          {/* Suggested Value */}
          {recommendation.suggestedValue && (
            <div className="bg-slate-900/50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-slate-500 mb-2">Suggested Action</h4>
              <div className="space-y-1 text-sm">
                {recommendation.suggestedValue.budget_increase_percent && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-slate-300">Increase budget by {recommendation.suggestedValue.budget_increase_percent}%</span>
                  </div>
                )}
                {recommendation.suggestedValue.budget_decrease_percent && (
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-yellow-400" />
                    <span className="text-slate-300">Decrease budget by {recommendation.suggestedValue.budget_decrease_percent}%</span>
                  </div>
                )}
                {recommendation.suggestedValue.suggested_daily_budget && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">Suggested daily budget: {formatCurrency(recommendation.suggestedValue.suggested_daily_budget)}</span>
                  </div>
                )}
                {recommendation.suggestedValue.reactivation_conditions && (
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-300">Reactivate when: {recommendation.suggestedValue.reactivation_conditions.join(', ')}</span>
                  </div>
                )}
                {recommendation.suggestedValue.expansion_type && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span className="text-slate-300">Expand to {recommendation.suggestedValue.expansion_type} audience ({recommendation.suggestedValue.lookalike_percentage}%)</span>
                  </div>
                )}
                {recommendation.suggestedValue.refresh_elements && (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-purple-400" />
                    <span className="text-slate-300">Refresh: {recommendation.suggestedValue.refresh_elements.join(', ')}</span>
                  </div>
                )}
                {recommendation.suggestedValue.rationale && (
                  <p className="text-xs text-slate-500 mt-2 italic">{recommendation.suggestedValue.rationale}</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => handleAction('apply')}
              disabled={processing}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              <Check className="w-4 h-4" />
              {processing ? 'Processing...' : 'Apply'}
            </button>
            <button
              onClick={() => handleAction('dismiss')}
              disabled={processing}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function RecommendationsPanel({
  recommendations,
  loading,
  hasData,
  message,
  onApply,
  onDismiss
}: RecommendationsPanelProps) {
  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
          <h2 className="text-lg font-bold text-white">Scaling Recommendations</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-slate-700 rounded-lg"></div>
          <div className="h-20 bg-slate-700 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!hasData || recommendations.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-white">Scaling Recommendations</h2>
        </div>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">{message || 'No recommendations available.'}</p>
        </div>
      </div>
    )
  }

  // Group by action type
  const grouped = recommendations.reduce((acc, rec) => {
    if (!acc[rec.actionType]) acc[rec.actionType] = []
    acc[rec.actionType].push(rec)
    return acc
  }, {} as Record<RecommendationAction, CampaignRecommendation[]>)

  const actionOrder: RecommendationAction[] = [
    'increase_budget',
    'duplicate',
    'expand_audience',
    'refresh_creatives',
    'decrease_budget',
    'pause',
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-white">Scaling Recommendations</h2>
        </div>
        <span className="text-sm text-slate-400">{recommendations.length} recommendations</span>
      </div>

      {actionOrder.map((actionType) => {
        const group = grouped[actionType]
        if (!group || group.length === 0) return null

        return (
          <div key={actionType}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-sm font-medium ${getActionColor(actionType).split(' ')[0]}`}>
                {getActionLabel(actionType)}
              </span>
              <span className="text-xs text-slate-500">({group.length})</span>
            </div>
            <div className="space-y-3">
              {group.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onApply={onApply}
                  onDismiss={onDismiss}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
