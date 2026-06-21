/**
 * Alert Worker - Scans campaigns for performance anomalies
 */

import { Job } from 'bull'
import { alertQueue } from './queue'
import { createClient } from '@supabase/supabase-js'
import { logger } from '../logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AlertJobData {
  workspaceId: string
  campaignIds?: string[]
  scanType: 'all' | 'specific'
}

/**
 * Evaluate alert rules for campaigns
 */
alertQueue.process('scan-alerts', async (job: Job<AlertJobData>) => {
  const { workspaceId, campaignIds, scanType } = job.data

  logger.info('Alert scan started', { workspaceId, scanType })
  job.progress(10)

  try {
    // 1. Fetch campaigns to scan
    let query = supabase
      .from('meta_campaigns')
      .select(`
        id,
        campaign_id,
        name,
        ad_account_id,
        meta_connection_id
      `)
      .eq('meta_connection_id', workspaceId)

    if (scanType === 'specific' && campaignIds) {
      query = query.in('id', campaignIds)
    }

    const { data: campaigns, error: campaignError } = await query

    if (campaignError) {
      throw new Error(`Failed to fetch campaigns: ${campaignError.message}`)
    }

    if (!campaigns || campaigns.length === 0) {
      logger.info('No campaigns to scan', { workspaceId })
      return { scanned: 0, alertsGenerated: 0 }
    }

    job.progress(30)

    let alertsGenerated = 0
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // 2. For each campaign, fetch metrics and evaluate rules
    for (let i = 0; i < campaigns.length; i++) {
      const campaign = campaigns[i]
      
      // Fetch today's and yesterday's metrics
      const { data: todayMetrics } = await supabase
        .from('meta_insights')
        .select('*')
        .eq('entity_type', 'campaign')
        .eq('entity_id_meta', campaign.campaign_id)
        .eq('date', today)
        .single()

      const { data: yesterdayMetrics } = await supabase
        .from('meta_insights')
        .select('*')
        .eq('entity_type', 'campaign')
        .eq('entity_id_meta', campaign.campaign_id)
        .eq('date', yesterday)
        .single()

      if (!todayMetrics) continue

      // Evaluate alert rules
      const alerts = await evaluateAlertRules(
        campaign,
        todayMetrics,
        yesterdayMetrics,
        workspaceId
      )

      alertsGenerated += alerts.length

      job.progress(30 + (i / campaigns.length) * 60)
    }

    job.progress(100)

    logger.info('Alert scan completed', {
      workspaceId,
      campaignsScanned: campaigns.length,
      alertsGenerated,
    })

    return {
      scanned: campaigns.length,
      alertsGenerated,
    }
  } catch (error) {
    logger.error('Alert scan failed', error, { workspaceId })
    throw error
  }
})

/**
 * Evaluate all alert rules for a campaign
 */
async function evaluateAlertRules(
  campaign: any,
  todayMetrics: any,
  yesterdayMetrics: any,
  workspaceId: string
): Promise<any[]> {
  const alerts: any[] = []

  // Calculate ROAS
  const todayRoas = todayMetrics.purchase_value / todayMetrics.spend
  const yesterdayRoas = yesterdayMetrics?.purchase_value / yesterdayMetrics?.spend

  // Rule 1: ROAS Drop (30%+ decline)
  if (yesterdayRoas && todayRoas && yesterdayRoas > 0) {
    const roasChange = (yesterdayRoas - todayRoas) / yesterdayRoas
    if (roasChange >= 0.3) {
      const severity = roasChange >= 0.5 ? 'critical' : 'warning'
      const dedupKey = `roas_drop:${campaign.id}:${getWindowStart(24)}`
      
      if (await checkDeduplication(dedupKey)) {
        const alert = await createAlert({
          campaign_id: campaign.id,
          workspace_id: workspaceId,
          alert_type: 'roas_drop',
          severity,
          title: `ROAS Dropped ${Math.round(roasChange * 100)}% - ${campaign.name}`,
          message: `Campaign ROAS dropped from ${yesterdayRoas.toFixed(2)}x to ${todayRoas.toFixed(2)}x`,
          metric_name: 'roas',
          metric_value: todayRoas,
          threshold_value: yesterdayRoas * 0.7,
          previous_value: yesterdayRoas,
        })
        
        await saveDeduplication(dedupKey, alert.id)
        alerts.push(alert)
      }
    }
  }

  // Rule 2: CPA Spike (40%+ increase)
  const todayCpa = todayMetrics.spend / todayMetrics.conversions
  const yesterdayCpa = yesterdayMetrics?.spend / yesterdayMetrics?.conversions

  if (yesterdayCpa && todayCpa && yesterdayCpa > 0) {
    const cpaChange = (todayCpa - yesterdayCpa) / yesterdayCpa
    if (cpaChange >= 0.4) {
      const severity = cpaChange >= 0.75 ? 'critical' : 'warning'
      const dedupKey = `cpa_spike:${campaign.id}:${getWindowStart(24)}`
      
      if (await checkDeduplication(dedupKey)) {
        const alert = await createAlert({
          campaign_id: campaign.id,
          workspace_id: workspaceId,
          alert_type: 'cpa_spike',
          severity,
          title: `CPA Increased ${Math.round(cpaChange * 100)}% - ${campaign.name}`,
          message: `Campaign CPA spiked from $${yesterdayCpa.toFixed(2)} to $${todayCpa.toFixed(2)}`,
          metric_name: 'cpa',
          metric_value: todayCpa,
          threshold_value: yesterdayCpa * 1.4,
          previous_value: yesterdayCpa,
        })
        
        await saveDeduplication(dedupKey, alert.id)
        alerts.push(alert)
      }
    }
  }

  // Rule 3: High Frequency (> 5.0)
  if (todayMetrics.frequency > 5.0) {
    const severity = todayMetrics.frequency > 7.0 ? 'critical' : 'warning'
    const dedupKey = `high_frequency:${campaign.id}:${getWindowStart(48)}`
    
    if (await checkDeduplication(dedupKey)) {
      const alert = await createAlert({
        campaign_id: campaign.id,
        workspace_id: workspaceId,
        alert_type: 'high_frequency',
        severity,
        title: `High Frequency Detected - ${campaign.name}`,
        message: `Campaign frequency is ${todayMetrics.frequency.toFixed(1)} (threshold: 5.0). Ad fatigue likely.`,
        metric_name: 'frequency',
        metric_value: todayMetrics.frequency,
        threshold_value: 5.0,
      })
      
      await saveDeduplication(dedupKey, alert.id)
      alerts.push(alert)
    }
  }

  // Rule 4: Pixel Issue (high spend, zero conversions)
  if (todayMetrics.spend > 50 && todayMetrics.conversions === 0) {
    const dedupKey = `pixel_issue:${campaign.id}:${getWindowStart(24)}`
    
    if (await checkDeduplication(dedupKey)) {
      const alert = await createAlert({
        campaign_id: campaign.id,
        workspace_id: workspaceId,
        alert_type: 'pixel_issue',
        severity: 'critical',
        title: `Possible Tracking Issue - ${campaign.name}`,
        message: `Spent $${todayMetrics.spend.toFixed(2)} with zero conversions. Check pixel configuration.`,
        metric_name: 'conversions',
        metric_value: 0,
        threshold_value: 1,
      })
      
      await saveDeduplication(dedupKey, alert.id)
      alerts.push(alert)
    }
  }

  return alerts
}

/**
 * Create alert in database
 */
async function createAlert(alertData: any) {
  const { data, error } = await supabase
    .from('campaign_alerts')
    .insert(alertData)
    .select()
    .single()

  if (error) {
    logger.error('Failed to create alert', error, { alertData })
    throw error
  }

  // Create notification for workspace members
  await createNotifications(alertData.workspace_id, data)

  return data
}

/**
 * Create notifications for workspace members
 */
async function createNotifications(workspaceId: string, alert: any) {
  // Get workspace members
  const { data: members } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)

  if (!members) return

  // Create notification for each member
  const notifications = members.map(member => ({
    user_id: member.user_id,
    workspace_id: workspaceId,
    type: 'alert',
    title: alert.title,
    message: alert.message,
    data: { alert_id: alert.id, campaign_id: alert.campaign_id },
    channel: 'in_app',
  }))

  await supabase.from('user_notifications').insert(notifications)
}

/**
 * Check if alert already exists in deduplication window
 */
async function checkDeduplication(dedupKey: string): Promise<boolean> {
  const { data } = await supabase
    .from('alert_dedup')
    .select('id')
    .eq('alert_key', dedupKey)
    .single()

  return !data // Return true if no duplicate found
}

/**
 * Save deduplication entry
 */
async function saveDeduplication(dedupKey: string, alertId: string) {
  await supabase.from('alert_dedup').insert({
    alert_key: dedupKey,
    alert_id: alertId,
  })
}

/**
 * Get window start timestamp for deduplication
 */
function getWindowStart(hours: number): string {
  const now = new Date()
  now.setHours(now.getHours() - (now.getHours() % hours), 0, 0, 0)
  return now.toISOString()
}

// Event listeners
alertQueue.on('completed', (job, result) => {
  logger.info('Alert scan job completed', { jobId: job.id, result })
})

alertQueue.on('failed', (job, err) => {
  logger.error('Alert scan job failed', err, { jobId: job?.id })
})

console.log('[Alert Worker] Started and ready to scan for alerts')
