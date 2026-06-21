export type ReportFormat = 'csv' | 'excel' | 'pdf'
export type ReportType =
  | 'campaign_summary'
  | 'performance'
  | 'insights'
  | 'health'
  | 'recommendations'
  | 'forecasts'
  | 'alerts'

export interface ReportFilter {
  startDate?: string
  endDate?: string
  campaignIds?: string[]
  metrics?: string[]
}

export interface ReportRequest {
  reportType: ReportType
  format: ReportFormat
  title: string
  description?: string
  filters: ReportFilter
}

export interface ReportRecord {
  id: string
  workspaceId: string
  userId: string
  reportType: ReportType
  format: ReportFormat
  title: string
  description?: string
  filters: ReportFilter
  fileUrl?: string
  fileSize?: number
  status: 'pending' | 'generating' | 'completed' | 'failed'
  errorMessage?: string
  generatedAt?: string
  expiresAt?: string
  createdAt: string
}

// CSV generation helpers
function escapeCsv(value: any): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCsv(headers: string[], rows: any[][]): string {
  const headerLine = headers.map(escapeCsv).join(',')
  const dataLines = rows.map((row) => row.map(escapeCsv).join(','))
  return [headerLine, ...dataLines].join('\n')
}

function formatValue(value: any, type?: string): string {
  if (value === null || value === undefined) return ''
  if (type === 'currency') return `$${Number(value).toFixed(2)}`
  if (type === 'percent') return `${Number(value).toFixed(2)}%`
  if (type === 'ratio') return `${Number(value).toFixed(2)}x`
  if (type === 'number') return Number(value).toLocaleString()
  return String(value)
}

export function generateCampaignSummaryReport(
  campaigns: any[],
  insights: Record<string, any>
): { csv: string; rows: number } {
  const headers = [
    'Campaign ID', 'Campaign Name', 'Status', 'Objective',
    'Spend', 'Revenue', 'ROAS', 'CPA', 'CTR', 'Clicks',
    'Impressions', 'Conversions', 'Reach', 'Frequency',
  ]

  const rows = campaigns.map((c) => {
    const ins = insights[c.campaign_id]
    if (!ins) {
      return [
        c.campaign_id, c.name, c.status, c.objective || '',
        '0', '0', '0', '0', '0', '0', '0', '0', '0', '0',
      ]
    }

    const roas = ins.spend > 0 ? (ins.purchase_value || 0) / ins.spend : 0
    const cpa = ins.conversions > 0 ? ins.spend / ins.conversions : 0
    const ctr = ins.impressions > 0 ? (ins.clicks / ins.impressions) * 100 : 0
    const frequency = ins.reach > 0 ? ins.impressions / ins.reach : 0

    return [
      c.campaign_id,
      c.name,
      c.status,
      c.objective || '',
      formatValue(ins.spend || 0, 'currency'),
      formatValue(ins.purchase_value || 0, 'currency'),
      formatValue(roas, 'ratio'),
      formatValue(cpa || 0, 'currency'),
      formatValue(ctr, 'percent'),
      formatValue(ins.clicks || 0, 'number'),
      formatValue(ins.impressions || 0, 'number'),
      formatValue(ins.conversions || 0, 'number'),
      formatValue(ins.reach || 0, 'number'),
      formatValue(frequency, 'number'),
    ]
  })

  return { csv: toCsv(headers, rows), rows: rows.length }
}

export function generatePerformanceReport(
  timeSeries: any[]
): { csv: string; rows: number } {
  const headers = [
    'Date', 'Spend', 'Revenue', 'ROAS', 'CPA', 'CTR',
    'CPC', 'CPM', 'Clicks', 'Impressions', 'Conversions', 'Purchases',
  ]

  const rows = timeSeries.map((d) => {
    const roas = d.spend > 0 ? (d.purchase_value || d.revenue || 0) / d.spend : 0
    const cpa = d.conversions > 0 ? d.spend / d.conversions : 0
    const ctr = d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0
    const cpc = d.clicks > 0 ? d.spend / d.clicks : 0
    const cpm = d.impressions > 0 ? (d.spend / d.impressions) * 1000 : 0

    return [
      d.date,
      formatValue(d.spend || 0, 'currency'),
      formatValue(d.purchase_value || d.revenue || 0, 'currency'),
      formatValue(roas, 'ratio'),
      formatValue(cpa || 0, 'currency'),
      formatValue(ctr, 'percent'),
      formatValue(cpc, 'currency'),
      formatValue(cpm, 'currency'),
      formatValue(d.clicks || 0, 'number'),
      formatValue(d.impressions || 0, 'number'),
      formatValue(d.conversions || 0, 'number'),
      formatValue(d.purchases || 0, 'number'),
    ]
  })

  return { csv: toCsv(headers, rows), rows: rows.length }
}

export function generateInsightsReport(
  insights: any[]
): { csv: string; rows: number } {
  const headers = [
    'Date', 'Entity Type', 'Entity ID', 'Campaign Name',
    'Spend', 'Revenue', 'ROAS', 'CPA', 'CTR', 'Clicks',
    'Impressions', 'Conversions', 'Reach', 'Frequency',
  ]

  const rows = insights.map((ins) => {
    const roas = ins.spend > 0 ? (ins.purchase_value || 0) / ins.spend : 0
    const cpa = ins.conversions > 0 ? ins.spend / ins.conversions : 0
    const ctr = ins.impressions > 0 ? (ins.clicks / ins.impressions) * 100 : 0

    return [
      ins.date,
      ins.entity_type,
      ins.entity_id_meta,
      ins.campaign_name || '',
      formatValue(ins.spend || 0, 'currency'),
      formatValue(ins.purchase_value || 0, 'currency'),
      formatValue(roas, 'ratio'),
      formatValue(cpa || 0, 'currency'),
      formatValue(ctr, 'percent'),
      formatValue(ins.clicks || 0, 'number'),
      formatValue(ins.impressions || 0, 'number'),
      formatValue(ins.conversions || 0, 'number'),
      formatValue(ins.reach || 0, 'number'),
      formatValue(ins.frequency || 0, 'number'),
    ]
  })

  return { csv: toCsv(headers, rows), rows: rows.length }
}

export function generateAlertsReport(
  alerts: any[]
): { csv: string; rows: number } {
  const headers = [
    'Alert Type', 'Severity', 'Campaign', 'Title',
    'Message', 'Metric Name', 'Metric Value', 'Threshold',
    'Previous Value', 'Status', 'Created At',
  ]

  const rows = alerts.map((a) => [
    a.alert_type,
    a.severity,
    a.campaign?.name || '',
    a.title,
    a.message,
    a.metric_name || '',
    a.metric_value || '',
    a.threshold_value || '',
    a.previous_value || '',
    a.status,
    a.created_at,
  ])

  return { csv: toCsv(headers, rows), rows: rows.length }
}

export function generateRecommendationsReport(
  recommendations: any[]
): { csv: string; rows: number } {
  const headers = [
    'Action Type', 'Campaign', 'Confidence Score', 'Reasoning',
    'Current ROAS', 'Current CPA', 'Current CTR', 'Status', 'Created At',
  ]

  const rows = recommendations.map((r) => [
    r.action_type,
    r.campaign?.name || '',
    r.confidence_score,
    r.reasoning,
    r.current_metrics?.roas || '',
    r.current_metrics?.cpa || '',
    r.current_metrics?.ctr || '',
    r.status,
    r.created_at,
  ])

  return { csv: toCsv(headers, rows), rows: rows.length }
}

export function generateForecastsReport(
  forecasts: any[]
): { csv: string; rows: number } {
  const headers = [
    'Forecast Type', 'Campaign', 'Period Days', 'Predicted Total',
    'Confidence Lower', 'Confidence Upper', 'Confidence Level',
    'Trend', 'Trend %', 'Historical Data Points', 'Generated At',
  ]

  const rows = forecasts.map((f) => [
    f.forecast_type,
    f.campaign?.name || 'All Campaigns',
    f.forecast_period_days,
    f.predicted_value,
    f.confidence_lower || '',
    f.confidence_upper || '',
    `${(f.confidence_level * 100).toFixed(0)}%`,
    f.trend || '',
    f.trend_percent || '',
    f.historical_data_points,
    f.generated_at,
  ])

  return { csv: toCsv(headers, rows), rows: rows.length }
}

export function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function getReportFilename(reportType: ReportType, format: ReportFormat): string {
  const timestamp = new Date().toISOString().split('T')[0]
  const typeMap: Record<ReportType, string> = {
    campaign_summary: 'campaign-summary',
    performance: 'performance',
    insights: 'insights',
    health: 'health-scores',
    recommendations: 'recommendations',
    forecasts: 'forecasts',
    alerts: 'alerts',
  }
  const ext = format === 'csv' ? 'csv' : format === 'excel' ? 'xlsx' : 'pdf'
  return `adpilot-${typeMap[reportType]}-${timestamp}.${ext}`
}

export function getReportLabel(reportType: ReportType): string {
  const labels: Record<ReportType, string> = {
    campaign_summary: 'Campaign Summary',
    performance: 'Performance Over Time',
    insights: 'Detailed Insights',
    health: 'Health Scores',
    recommendations: 'Recommendations',
    forecasts: 'Forecasts',
    alerts: 'Alerts',
  }
  return labels[reportType]
}
