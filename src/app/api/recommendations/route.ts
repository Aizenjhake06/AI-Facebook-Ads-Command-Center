import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateRecommendations } from '@/lib/recommendations'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  // Verify access
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Get connections
  const { data: connections } = await supabase
    .from('meta_connections')
    .select('id')
    .eq('workspace_id', workspaceId)

  if (!connections || connections.length === 0) {
    return NextResponse.json({
      recommendations: [],
      hasData: false,
      message: 'No Meta connections found.',
    })
  }

  const connectionIds = connections.map((c) => c.id)

  // Fetch campaigns
  const { data: campaigns } = await supabase
    .from('meta_campaigns')
    .select('id, campaign_id, name, status, effective_status, meta_connection_id')
    .in('meta_connection_id', connectionIds)

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({
      recommendations: [],
      hasData: false,
      message: 'No campaigns found.',
    })
  }

  // Fetch insights
  let query = supabase
    .from('meta_insights')
    .select('*')
    .in('meta_connection_id', connectionIds)
    .eq('entity_type', 'campaign')
    .order('date', { ascending: true })

  if (startDate) {
    query = query.gte('date', startDate)
  }
  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data: insightsData, error: insightsError } = await query

  if (insightsError) {
    return NextResponse.json({ error: insightsError.message }, { status: 500 })
  }

  if (!insightsData || insightsData.length === 0) {
    return NextResponse.json({
      recommendations: [],
      hasData: false,
      message: 'No performance data found.',
    })
  }

  // Aggregate insights by campaign
  const insightMap: Record<string, any> = {}
  insightsData.forEach((insight: any) => {
    const key = insight.entity_id_meta
    if (!insightMap[key]) {
      insightMap[key] = {
        impressions: 0,
        clicks: 0,
        spend: 0,
        conversions: 0,
        purchase_value: 0,
        reach: 0,
      }
    }
    insightMap[key].impressions += insight.impressions || 0
    insightMap[key].clicks += insight.clicks || 0
    insightMap[key].spend += insight.spend || 0
    insightMap[key].conversions += insight.conversions || 0
    insightMap[key].purchase_value += insight.purchase_value || 0
    insightMap[key].reach += insight.reach || 0
  })

  // Generate recommendations
  const recommendations = generateRecommendations(campaigns, insightMap)

  // Store recommendations in database
  const dbRecords = recommendations.map((rec) => ({
    campaign_id: campaigns.find((c: any) => c.campaign_id === rec.campaignId)?.id,
    workspace_id: workspaceId,
    action_type: rec.actionType,
    confidence_score: rec.confidenceScore,
    reasoning: rec.reasoning,
    current_metrics: rec.currentMetrics,
    suggested_value: rec.suggestedValue,
    status: 'pending',
  })).filter((r) => r.campaign_id)

  if (dbRecords.length > 0) {
    await supabase.from('campaign_recommendations').insert(dbRecords)
  }

  return NextResponse.json({
    recommendations,
    hasData: true,
    generatedAt: new Date().toISOString(),
    dateRange: {
      start: startDate || insightsData[insightsData.length - 1]?.date,
      end: endDate || insightsData[0]?.date,
    },
  })
}
