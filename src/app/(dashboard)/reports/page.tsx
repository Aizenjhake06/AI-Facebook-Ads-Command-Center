'use client'

import { useState, useCallback } from 'react'
import { useWorkspace } from '@/providers/WorkspaceProvider'
import { Download, FileSpreadsheet, FileText, FileCode, Share2, Calendar, ListFilter as Filter, Loader as Loader2, Check, CircleAlert as AlertCircle, Clock, ChevronDown, ExternalLink, Trash2 } from 'lucide-react'
import { getReportLabel, getReportFilename, type ReportType, type ReportFormat } from '@/lib/reports'

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'campaign_summary', label: 'Campaign Summary' },
  { value: 'performance', label: 'Performance Over Time' },
  { value: 'insights', label: 'Detailed Insights' },
  { value: 'alerts', label: 'Alerts' },
  { value: 'recommendations', label: 'Recommendations' },
  { value: 'forecasts', label: 'Forecasts' },
]

const FORMATS: { value: ReportFormat; label: string; icon: any }[] = [
  { value: 'csv', label: 'CSV', icon: FileCode },
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet },
  { value: 'pdf', label: 'PDF', icon: FileText },
]

export default function ReportsPage() {
  const { currentWorkspace } = useWorkspace()
  const [reportType, setReportType] = useState<ReportType>('campaign_summary')
  const [format, setFormat] = useState<ReportFormat>('csv')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const generateReport = async () => {
    if (!currentWorkspace) return

    setGenerating(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          report_type: reportType,
          format,
          title: getReportLabel(reportType),
          filters: {
            ...(startDate && { start_date: startDate }),
            ...(endDate && { end_date: endDate }),
          },
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = getReportFilename(reportType, format)
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setSuccess(`Report downloaded successfully!`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to generate report')
      }
    } catch (e: any) {
      setError(e.message || 'Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Reports & Export</h1>
        <p className="text-slate-400 mt-1">Generate and download campaign reports</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4 flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4 flex items-center gap-2 text-green-400">
          <Check className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Report Builder */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white"
            >
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Format</label>
            <div className="flex gap-2">
              {FORMATS.map((f) => {
                const Icon = f.icon
                return (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                      format === f.value
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white"
            />
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateReport}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium py-3 rounded-lg transition-colors"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Generate & Download Report
            </>
          )}
        </button>

        <p className="text-xs text-slate-500 text-center">
          Reports are generated from your synchronized campaign data.
          Large datasets may take a moment to process.
        </p>
      </div>

      {/* Report Types Info */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORT_TYPES.map((type) => (
          <div key={type.value} className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
            <h3 className="text-sm font-medium text-white">{type.label}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {type.value === 'campaign_summary' && 'Overview of all campaigns with key metrics like ROAS, CPA, CTR'}
              {type.value === 'performance' && 'Daily aggregated performance metrics over time'}
              {type.value === 'insights' && 'Detailed daily insights data for all campaigns'}
              {type.value === 'alerts' && 'All triggered alerts with severity and status'}
              {type.value === 'recommendations' && 'Generated scaling recommendations with confidence scores'}
              {type.value === 'forecasts' && 'Predicted future performance with confidence intervals'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
