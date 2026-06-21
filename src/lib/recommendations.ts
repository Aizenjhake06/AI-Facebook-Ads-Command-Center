export type RecommendationAction =
  | 'increase_budget'
  | 'decrease_budget'
  | 'pause'
  | 'duplicate'
  | 'refresh_creatives'
  | 'expand_audience'

export interface CampaignRecommendation {
  id: string
  campaignId: string
  campaignName: string
  actionType: RecommendationAction
  confidenceScore: number
  reasoning: string
  currentMetrics: Record<string, number | null>
  suggestedValue?: Record<string, any>
  status: 'pending' | 'applied' | 'dismissed' | 'expired'
  createdAt: string
}

interface CampaignMetrics {
  campaign_id: string
  campaign_name: string
  status: string
  effective_status: string | null
  spend: number
  impressions: number
  clicks: number
  conversions: number
  purchaseValue: number
  reach: number
  roas: number | null
  cpa: number | null
  ctr: number | null
  frequency: number | null
  conversionRate: number | null
}

function calculateConfidence(score: number, metricQuality: number): number {
  // Confidence based on health score and data quality
  const baseConfidence = score / 100
  const dataConfidence = Math.min(metricQuality, 1)
  return Math.round((baseConfidence * 0.6 + dataConfidence * 0.4) * 100) / 100
}

function generateReasoning(
  action: RecommendationAction,
  metrics: CampaignMetrics,
  score: number
): string {
  const roasStr = metrics.roas ? `${metrics.roas.toFixed(2)}x` : 'N/A'
  const cpaStr = metrics.cpa ? `$${metrics.cpa.toFixed(2)}` : 'N/A'
  const ctrStr = metrics.ctr ? `${metrics.ctr.toFixed(2)}%` : 'N/A'

  switch (action) {
    case 'increase_budget':
      return `Campaign "${metrics.campaign_name}" shows strong performance with ${roasStr} ROAS and ${ctrStr} CTR. Health score of ${score}/100 indicates high efficiency. Increasing budget by 20-30% could capture additional conversions while maintaining profitability.`

    case 'decrease_budget':
      return `Campaign "${metrics.campaign_name}" is underperforming with ${roasStr} ROAS (below break-even) and ${cpaStr} CPA. Health score of ${score}/100 suggests budget is being inefficiently allocated. Reducing spend by 20-30% will minimize losses while you optimize targeting and creative.`

    case 'pause':
      return `Campaign "${metrics.campaign_name}" has a critically low health score of ${score}/100 with ${roasStr} ROAS and ${cpaStr} CPA. After spending $${metrics.spend.toFixed(2)} with poor returns, pausing this campaign is recommended to reallocate budget to better-performing campaigns.`

    case 'duplicate':
      return `Campaign "${metrics.campaign_name}" is performing well (${roasStr} ROAS, ${score}/100 health score) with room to scale. Duplicating with slight targeting or creative variations can test new audiences while preserving the winning formula.`

    case 'refresh_creatives':
      return `Campaign "${metrics.campaign_name}" has a CTR of ${ctrStr} which is below optimal. With ${metrics.frequency?.toFixed(1) ?? 'N/A'} frequency, users may be experiencing ad fatigue. Refreshing creatives with new imagery and copy can re-engage the audience.`

    case 'expand_audience':
      return `Campaign "${metrics.campaign_name}" shows strong engagement (${ctrStr} CTR) and conversion rate. The current audience may be saturated at ${metrics.frequency?.toFixed(1) ?? 'N/A'} frequency. Expanding to lookalike audiences or broader targeting can unlock new demand.`

    default:
      return `Based on current metrics, this action is recommended for campaign "${metrics.campaign_name}".`
  }
}

function determineAction(metrics: CampaignMetrics, healthScore: number): RecommendationAction | null {
  const roas = metrics.roas ?? 0
  const cpa = metrics.cpa ?? Infinity
  const ctr = metrics.ctr ?? 0
  const frequency = metrics.frequency ?? 0
  const conversionRate = metrics.conversionRate ?? 0

  // Critical performance - pause
  if (healthScore < 40 && metrics.spend > 50) {
    return 'pause'
  }

  // Poor ROAS with significant spend - decrease budget
  if (roas < 0.8 && metrics.spend > 100) {
    return 'decrease_budget'
  }

  // High frequency with decent performance - expand audience
  if (frequency > 4 && ctr > 0.8 && roas > 1.5) {
    return 'expand_audience'
  }

  // Low CTR with good ROAS - refresh creatives
  if (ctr < 0.5 && roas > 2.0 && metrics.impressions > 5000) {
    return 'refresh_creatives'
  }

  // Excellent performance - increase budget or duplicate
  if (roas > 3.0 && healthScore >= 80) {
    // If spend is low relative to potential, increase budget
    if (metrics.spend < 500) {
      return 'increase_budget'
    }
    // If already spending well, duplicate for scale
    return 'duplicate'
  }

  // Good performance - increase budget
  if (roas > 2.0 && healthScore >= 70) {
    return 'increase_budget'
  }

  // Moderate performance with room to improve
  if (roas > 1.0 && roas < 2.0 && ctr < 1.0) {
    return 'refresh_creatives'
  }

  return null
}

function getSuggestedValue(action: RecommendationAction, metrics: CampaignMetrics): Record<string, any> | undefined {
  switch (action) {
    case 'increase_budget':
      return {
        budget_increase_percent: 20,
        suggested_daily_budget: metrics.spend > 0 ? Math.round((metrics.spend / 30) * 1.2) : undefined,
        rationale: 'Increase by 20% to capture more conversions while ROAS remains strong'
      }
    case 'decrease_budget':
      return {
        budget_decrease_percent: 20,
        suggested_daily_budget: metrics.spend > 0 ? Math.round((metrics.spend / 30) * 0.8) : undefined,
        rationale: 'Decrease by 20% to minimize losses while optimizing'
      }
    case 'pause':
      return {
        pause_immediately: true,
        reactivation_conditions: ['ROAS > 1.5', 'CTR > 0.5%'],
        rationale: 'Pause to prevent further budget waste'
      }
    case 'duplicate':
      return {
        suggested_variations: ['Different audience segment', 'Slightly different creative'],
        keep_original_running: true,
        rationale: 'Duplicate to test scale while preserving winner'
      }
    case 'refresh_creatives':
      return {
        refresh_elements: ['Headline', 'Primary image', 'Call to action'],
        test_count: 3,
        rationale: 'Test 3 new creative variations against current winner'
      }
    case 'expand_audience':
      return {
        expansion_type: 'lookalike',
        lookalike_percentage: 1,
        rationale: 'Expand to 1% lookalike of current converters'
      }
    default:
      return undefined
  }
}

export function generateRecommendations(
  campaigns: any[],
  insights: Record<string, any>
): CampaignRecommendation[] {
  const recommendations: CampaignRecommendation[] = []

  for (const campaign of campaigns) {
    const ins = insights[campaign.campaign_id]
    if (!ins || ins.spend === 0) continue

    const metrics: CampaignMetrics = {
      campaign_id: campaign.campaign_id,
      campaign_name: campaign.name,
      status: campaign.status,
      effective_status: campaign.effective_status,
      spend: ins.spend || 0,
      impressions: ins.impressions || 0,
      clicks: ins.clicks || 0,
      conversions: ins.conversions || 0,
      purchaseValue: ins.purchase_value || 0,
      reach: ins.reach || 0,
      roas: ins.spend > 0 ? ins.purchase_value / ins.spend : null,
      cpa: ins.conversions > 0 ? ins.spend / ins.conversions : null,
      ctr: ins.impressions > 0 ? (ins.clicks / ins.impressions) * 100 : null,
      frequency: ins.reach > 0 ? ins.impressions / ins.reach : null,
      conversionRate: ins.clicks > 0 ? (ins.conversions / ins.clicks) * 100 : null,
    }

    // Calculate a simple health score for confidence
    const roasScore = metrics.roas ? Math.min(100, (metrics.roas / 4) * 100) : 0
    const ctrScore = metrics.ctr ? Math.min(100, (metrics.ctr / 2) * 100) : 0
    const cpaScore = metrics.cpa ? Math.max(0, 100 - (metrics.cpa / 50) * 100) : 0
    const healthScore = Math.round((roasScore * 0.4 + ctrScore * 0.3 + cpaScore * 0.3))

    const action = determineAction(metrics, healthScore)
    if (!action) continue

    // Data quality based on number of data points
    const metricQuality = metrics.spend > 100 && metrics.impressions > 1000 ? 0.9 : 0.6
    const confidence = calculateConfidence(healthScore, metricQuality)

    // Only recommend if confidence is reasonable
    if (confidence < 0.4) continue

    const reasoning = generateReasoning(action, metrics, healthScore)
    const suggestedValue = getSuggestedValue(action, metrics)

    recommendations.push({
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      campaignId: campaign.campaign_id,
      campaignName: campaign.name,
      actionType: action,
      confidenceScore: confidence,
      reasoning,
      currentMetrics: {
        roas: metrics.roas,
        cpa: metrics.cpa,
        ctr: metrics.ctr,
        frequency: metrics.frequency,
        conversionRate: metrics.conversionRate,
        spend: metrics.spend,
        impressions: metrics.impressions,
        clicks: metrics.clicks,
        conversions: metrics.conversions,
      },
      suggestedValue,
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
  }

  // Sort by confidence descending
  recommendations.sort((a, b) => b.confidenceScore - a.confidenceScore)

  return recommendations
}

export function getActionLabel(action: RecommendationAction): string {
  const labels: Record<RecommendationAction, string> = {
    increase_budget: 'Increase Budget',
    decrease_budget: 'Decrease Budget',
    pause: 'Pause Campaign',
    duplicate: 'Duplicate Campaign',
    refresh_creatives: 'Refresh Creatives',
    expand_audience: 'Expand Audience',
  }
  return labels[action]
}

export function getActionColor(action: RecommendationAction): string {
  const colors: Record<RecommendationAction, string> = {
    increase_budget: 'text-green-400 bg-green-400/10 border-green-400/30',
    decrease_budget: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    pause: 'text-red-400 bg-red-400/10 border-red-400/30',
    duplicate: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    refresh_creatives: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
    expand_audience: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/30',
  }
  return colors[action]
}

export function getActionIcon(action: RecommendationAction): string {
  const icons: Record<RecommendationAction, string> = {
    increase_budget: 'TrendingUp',
    decrease_budget: 'TrendingDown',
    pause: 'Pause',
    duplicate: 'Copy',
    refresh_creatives: 'RefreshCw',
    expand_audience: 'Users',
  }
  return icons[action]
}
