/**
 * Report Worker - Generates reports asynchronously
 */

import { Job } from 'bull'
import { reportQueue } from './queue'
import { createClient } from '@supabase/supabase-js'
import { logger } from '../logger'
import * as fs from 'fs'
import * as path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ReportJobData {
  reportId: string
  workspaceId: string
  userId: string
  reportType: string
  format: 'csv' | 'excel' | 'pdf'
  filters: any
}

/**
 * Process report generation jobs
 */
reportQueue.process('generate-report', async (job: Job<ReportJobData>) => {
  const { reportId, workspaceId, reportType, format, filters } = job.data

  logger.info('Report generation started', { reportId, reportType, format })
  job.progress(10)

  try {
    // 1. Update report status to generating
    await supabase
      .from('campaign_reports')
      .update({ status: 'generating' })
      .eq('id', reportId)

    job.progress(20)

    // 2. Fetch data based on report type
    let reportData: any
    switch (reportType) {
      case 'campaign_summary':
        reportData = await generateCampaignSummary(workspaceId, filters)
        break
      case 'performance':
        reportData = await generatePerformanceReport(workspaceId, filters)
        break
      case 'insights':
        reportData = await generateInsightsReport(workspaceId, filters)
        break
      case 'health':
        reportData = await generateHealthReport(workspaceId, filters)
        break
      case 'recommendations':
        reportData = await generateRecommendationsReport(workspaceId, filters)
        break
      case 'forecasts':
        reportData = await generateForecastsReport(workspaceId, filters)
        break
      case 'alerts':
        reportData = await generateAlertsReport(workspaceId, filters)
        break
      default:
        throw new Error(`Unknown report type: ${reportType}`)
    }

    job.progress(60)

    // 3. Format data based on requested format
    let fileContent: string
    let fileName: string
    let mimeType: string

    switch (format) {
      case 'csv':
        fileContent = formatAsCSV(reportData)
        fileName = `${reportType}_${Date.now()}.csv`
        mimeType = 'text/csv'
        break
      case 'excel':
        const { generateExcel, formatCampaignDataForExcel } = await import('../reports/excel-generator')
        const excelSheet = formatCampaignDataForExcel(reportData)
        const excelBuffer = await generateExcel([excelSheet])
        fileContent = excelBuffer.toString('base64') // Store as base64
        fileName = `${reportType}_${Date.now()}.xlsx`
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        break
      case 'pdf':
        const { generatePDF, formatCampaignDataForPDF } = await import('../reports/pdf-generator')
        const pdfOptions = formatCampaignDataForPDF(reportData, {
          start: filters.startDate || '2020-01-01',
          end: filters.endDate || new Date().toISOString().split('T')[0],
        })
        const pdfBuffer = await generatePDF(pdfOptions)
        fileContent = pdfBuffer.toString('base64') // Store as base64
        fileName = `${reportType}_${Date.now()}.pdf`
        mimeType = 'application/pdf'
        break
      default:
        throw new Error(`Unknown format: ${format}`)
    }

    job.progress(80)

    // 4. Save file (in production, upload to S3/GCS/Supabase Storage)
    const reportsDir = path.join(process.cwd(), 'public', 'reports')
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }

    const filePath = path.join(reportsDir, fileName)
    
    // Write binary formats as buffers, text formats as strings
    if (format === 'excel' || format === 'pdf') {
      fs.writeFileSync(filePath, Buffer.from(fileContent, 'base64'))
    } else {
      fs.writeFileSync(filePath, fileContent)
    }

    const fileUrl = `/reports/${fileName}`
    const fileSize = format === 'excel' || format === 'pdf' 
      ? Buffer.from(fileContent, 'base64').length 
      : Buffer.byteLength(fileContent)

    job.progress(90)

    // 5. Update report record
    await supabase
      .from('campaign_reports')
      .update({
        status: 'completed',
        file_url: fileUrl,
        file_size: fileSize,
        generated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), // 30 days
      })
      .eq('id', reportId)

    // 6. Create notification
    await supabase.from('user_notifications').insert({
      user_id: job.data.userId,
      workspace_id: workspaceId,
      type: 'report_ready',
      title: 'Report Ready',
      message: `Your ${reportType} report is ready for download`,
      data: { report_id: reportId, file_url: fileUrl },
      channel: 'in_app',
    })

    job.progress(100)

    logger.info('Report generation completed', { reportId, fileName, fileSize })

    return {
      reportId,
      fileUrl,
      fileSize,
    }
  } catch (error) {
    logger.error('Report generation failed', error, { reportId })

    // Update report as failed
    await supabase
      .from('campaign_reports')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', reportId)

    throw error
  }
})

/**
 * Generate campaign summary report
 */
async function generateCampaignSummary(workspaceId: string, filters: any) {
  const { data: campaigns } = await supabase
    .from('meta_campaigns')
    .select(`
      campaign_id,
      name,
      status,
      objective,
      daily_budget,
      lifetime_budget,
      created_at
    `)
    .eq('meta_connection_id', workspaceId)

  // Fetch aggregated metrics for each campaign
  const campaignsWithMetrics = await Promise.all(
    (campaigns || []).map(async (campaign) => {
      const { data: metrics } = await supabase
        .from('meta_insights')
        .select('spend, impressions, clicks, conversions, purchase_value')
        .eq('entity_type', 'campaign')
        .eq('entity_id_meta', campaign.campaign_id)
        .gte('date', filters.startDate || '2020-01-01')
        .lte('date', filters.endDate || new Date().toISOString())

      const totals = (metrics || []).reduce(
        (acc, m) => ({
          spend: acc.spend + (m.spend || 0),
          impressions: acc.impressions + (m.impressions || 0),
          clicks: acc.clicks + (m.clicks || 0),
          conversions: acc.conversions + (m.conversions || 0),
          revenue: acc.revenue + (m.purchase_value || 0),
        }),
        { spend: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0 }
      )

      const roas = totals.spend > 0 ? totals.revenue / totals.spend : 0
      const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0
      const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0

      return {
        ...campaign,
        ...totals,
        roas: roas.toFixed(2),
        ctr: ctr.toFixed(2),
        cpc: cpc.toFixed(2),
      }
    })
  )

  return campaignsWithMetrics
}

/**
 * Generate performance report
 */
async function generatePerformanceReport(workspaceId: string, filters: any) {
  // Similar to campaign summary but with daily breakdown
  return await generateCampaignSummary(workspaceId, filters)
}

/**
 * Generate insights report
 */
async function generateInsightsReport(workspaceId: string, filters: any) {
  // TODO: Implement AI insights aggregation
  return []
}

/**
 * Generate health report
 */
async function generateHealthReport(workspaceId: string, filters: any) {
  // TODO: Implement health score report
  return []
}

/**
 * Generate recommendations report
 */
async function generateRecommendationsReport(workspaceId: string, filters: any) {
  const { data: recommendations } = await supabase
    .from('campaign_recommendations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')

  return recommendations || []
}

/**
 * Generate forecasts report
 */
async function generateForecastsReport(workspaceId: string, filters: any) {
  const { data: forecasts } = await supabase
    .from('campaign_forecasts')
    .select('*')
    .eq('workspace_id', workspaceId)

  return forecasts || []
}

/**
 * Generate alerts report
 */
async function generateAlertsReport(workspaceId: string, filters: any) {
  const { data: alerts } = await supabase
    .from('campaign_alerts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')

  return alerts || []
}

/**
 * Format data as CSV
 */
function formatAsCSV(data: any[]): string {
  if (!data || data.length === 0) {
    return ''
  }

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','), // Header row
    ...data.map(row =>
      headers.map(header => {
        const value = row[header]
        // Escape values with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value ?? ''
      }).join(',')
    ),
  ]

  return csvRows.join('\n')
}

// Event listeners
reportQueue.on('completed', (job, result) => {
  logger.info('Report job completed', { jobId: job.id, result })
})

reportQueue.on('failed', (job, err) => {
  logger.error('Report job failed', err, { jobId: job?.id })
})

console.log('[Report Worker] Started and ready to generate reports')
