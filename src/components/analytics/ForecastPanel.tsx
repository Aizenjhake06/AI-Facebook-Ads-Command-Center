'use client'

import { useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, CircleAlert as AlertCircle, ChartBar as BarChart3, DollarSign, Target, MousePointerClick, ShoppingCart, CreditCard } from 'lucide-react'
import type { CampaignForecast, ForecastType } from '@/lib/forecasting'
import { formatForecastValue, getForecastLabel } from '@/lib/forecasting'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/formatters'

interface ForecastPanelProps {
  forecasts: CampaignForecast[]
  loading?: boolean
  hasData?: boolean
  message?: string
}

const forecastConfig: Record<ForecastType, {
  icon: any
  color: string
  fillColor: string
  format: 'currency' | 'percent' | 'number' | 'ratio'
}> = {
  revenue: {
    icon: DollarSign,
    color: '#10b981',
    fillColor: 'url(#revenueGradient)',
    format: 'currency',
  },
  spend: {
    icon: CreditCard,
    color: '#3b82f6',
    fillColor: 'url(#spendGradient)',
    format: 'currency',
  },
  roas: {
    icon: Target,
    color: '#8b5cf6',
    fillColor: 'url(#roasGradient)',
    format: 'ratio',
  },
  cpa: {
    icon: MousePointerClick,
    color: '#f59e0b',
    fillColor: 'url(#cpaGradient)',
    format: 'currency',
  },
  purchases: {
    icon: ShoppingCart,
    color: '#22c55e',
    fillColor: 'url(#purchasesGradient)',
    format: 'number',
  },
}

function TrendIndicator({ trend, percent }: { trend: 'up' | 'down' | 'stable'; percent: number }) {
  if (trend === 'stable') {
    return (
      <div className="flex items-center gap-1 text-slate-400">
        <Minus className="w-4 h-4" />
        <span className="text-sm">Stable</span>
      </div>
    )
  }
  const isUp = trend === 'up'
  return (
    <div className={`flex items-center gap-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
      {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
      <span className="text-sm">{isUp ? '+' : ''}{percent.toFixed(1)}%</span>
    </div>
  )
}

function ForecastCard({ forecast }: { forecast: CampaignForecast }) {
  const [showConfidence, setShowConfidence] = useState(true)
  const config = forecastConfig[forecast.forecastType]
  const Icon = config.icon

  const chartData = forecast.dailyForecasts.map((d) => ({
    date: d.date,
    predicted: d.predicted,
    lower: d.confidenceLower,
    upper: d.confidenceUpper,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  const formatValue = (v: number) => {
    switch (config.format) {
      case 'currency':
        return formatCurrency(v)
      case 'percent':
        return formatPercent(v)
      case 'ratio':
        return `${v.toFixed(2)}x`
      case 'number':
        return formatNumber(v)
      default:
        return v.toFixed(2)
    }
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ backgroundColor: `${config.color}20` }}>
            <Icon className="w-5 h-5" style={{ color: config.color }} />
          </div>
          <div>
            <h3 className="text-white font-medium">{getForecastLabel(forecast.forecastType)} Forecast</h3>
            <p className="text-xs text-slate-400">Next {forecast.periodDays} days</p>
          </div>
        </div>
        <div className="text-right">
          <TrendIndicator trend={forecast.trend} percent={forecast.trendPercent} />
          <p className="text-xs text-slate-500 mt-1">{forecast.historicalDataPoints} days history</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-xs text-slate-500">Predicted Total</p>
          <p className="text-lg font-bold text-white">{formatValue(forecast.predictedTotal)}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-xs text-slate-500">Lower Bound</p>
          <p className="text-lg font-bold text-slate-300">{formatValue(forecast.confidenceLower)}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-xs text-slate-500">Upper Bound</p>
          <p className="text-lg font-bold text-slate-300">{formatValue(forecast.confidenceUpper)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`${forecast.forecastType}Gradient`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={config.color} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`${forecast.forecastType}Confidence`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={config.color} stopOpacity={0.1} />
                <stop offset="95%" stopColor={config.color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              tick={{ fill: '#64748b', fontSize: 10 }}
              interval={Math.floor(chartData.length / 6)}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickFormatter={(v) => {
                if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
                return v.toFixed(0)
              }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null
                const data = payload[0]?.payload
                return (
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
                    <p className="text-slate-400 text-xs mb-2">{label}</p>
                    <p className="text-sm">
                      <span style={{ color: config.color }} className="font-medium">Predicted:</span>
                      <span className="text-white ml-2">{formatValue(data?.predicted || 0)}</span>
                    </p>
                    {showConfidence && (
                      <>
                        <p className="text-xs text-slate-500 mt-1">
                          Range: {formatValue(data?.lower || 0)} - {formatValue(data?.upper || 0)}
                        </p>
                      </>
                    )}
                  </div>
                )
              }}
            />
            {showConfidence && (
              <Area
                type="monotone"
                dataKey="upper"
                stroke="none"
                fill={`url(#${forecast.forecastType}Confidence)`}
                name="Upper"
              />
            )}
            {showConfidence && (
              <Area
                type="monotone"
                dataKey="lower"
                stroke="none"
                fill="transparent"
                name="Lower"
              />
            )}
            <Area
              type="monotone"
              dataKey="predicted"
              stroke={config.color}
              strokeWidth={2}
              fill={`url(#${forecast.forecastType}Gradient)`}
              name="Predicted"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showConfidence}
            onChange={(e) => setShowConfidence(e.target.checked)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500"
          />
          <span className="text-xs text-slate-400">Show confidence interval</span>
        </label>
        <span className="text-xs text-slate-500">
          {Math.round(forecast.confidenceLevel * 100)}% confidence
        </span>
      </div>
    </div>
  )
}

export function ForecastPanel({ forecasts, loading, hasData, message }: ForecastPanelProps) {
  const [selectedType, setSelectedType] = useState<ForecastType | 'all'>('all')

  if (loading) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-400 animate-pulse" />
          <h2 className="text-lg font-bold text-white">Performance Forecasts</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-slate-700 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!hasData || forecasts.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-white">Performance Forecasts</h2>
        </div>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">{message || 'No forecast data available.'}</p>
        </div>
      </div>
    )
  }

  const filtered = selectedType === 'all'
    ? forecasts
    : forecasts.filter((f) => f.forecastType === selectedType)

  const typeOptions: { value: ForecastType | 'all'; label: string }[] = [
    { value: 'all', label: 'All Forecasts' },
    { value: 'revenue', label: 'Revenue' },
    { value: 'spend', label: 'Spend' },
    { value: 'roas', label: 'ROAS' },
    { value: 'cpa', label: 'CPA' },
    { value: 'purchases', label: 'Purchases' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-white">Performance Forecasts</h2>
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as ForecastType | 'all')}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
        >
          {typeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((forecast) => (
          <ForecastCard key={`${forecast.campaignId}-${forecast.forecastType}`} forecast={forecast} />
        ))}
      </div>
    </div>
  )
}
