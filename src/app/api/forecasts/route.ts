import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateForecasts, generateWorkspaceForecasts } from '@/lib/forecasting'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
  const campaignId = searchParams.get('campaign_id')
  const periodDays = parseInt(searchParams.get('period_days') || '14')
  const confidenceLevel = parseFloat(searchParams.get('confidence_level') || '0.95')

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
      forecasts: [],
      hasData: false,
      message: 'No Meta connections found.',
    })
  }

  const connectionIds = connections.map((c) => c.id)

  // Build insights query
  let query = supabase
    .from('meta_insights')
    .select('*')
    .in('meta_connection_id', connectionIds)
    .eq('entity_type', 'campaign')
    .order('date', { ascending: true })

  if (campaignId) {
    // Need to get the campaign's meta ID first
    const { data: campaign } = await supabase
      .from('meta_campaigns')
      .select('campaign_id, name')
      .eq('id', campaignId)
      .single()

    if (campaign) {
      query = query.eq('entity_id_meta', campaign.campaign_id)
    }
  }

  const { data: insightsData, error: insightsError } = await query

  if (insightsError) {
    return NextResponse.json({ error: insightsError.message }, { status: 500 })
  }

  if (!insightsData || insightsData.length === 0) {
    return NextResponse.json({
      forecasts: [],
      hasData: false,
      message: 'No performance data found for forecasting.',
    })
  }

  let forecasts: any[] = []

  if (campaignId) {
    // Single campaign forecast
    const campaign = await supabase
      .from('meta_campaigns')
      .select('campaign_id, name')
      .eq('id', campaignId)
      .single()

    if (campaign.data) {
      const timeSeries = insightsData.map((i: any) => ({
        date: i.date,
        spend: i.spend || 0,
        revenue: i.purchase_value || 0,
        purchase_value: i.purchase_value || 0,
        clicks: i.clicks || 0,
        impressions: i.impressions || 0,
        conversions: i.conversions || 0,
        roas: i.spend > 0 ? (i.purchase_value || 0) / i.spend : 0,
        cpa: i.conversions > 0 ? i.spend / i.conversions : 0,
      }))

      forecasts = generateForecasts(
        campaign.data.campaign_id,
        campaign.data.name,
        timeSeries,
        periodDays,
        confidenceLevel
      )
    }
  } else {
    // Workspace-level aggregated forecast
    const timeSeries = insightsData.map((i: any) => ({
      date: i.date,
      spend: i.spend || 0,
      revenue: i.purchase_value || 0,
      purchase_value: i.purchase_value || 0,
      clicks: i.clicks || 0,
      impressions: i.impressions || 0,
      conversions: i.conversions || 0,
      roas: i.spend > 0 ? (i.purchase_value || 0) / i.spend : 0,
      cpa: i.conversions > 0 ? i.spend / i.conversions : 0,
    }))

    forecasts = generateWorkspaceForecasts(timeSeries, periodDays)
  }

  // Store forecasts in database
  const dbRecords = forecasts.map((f) => ({
    campaign_id: campaignId || null,
    workspace_id: workspaceId,
    forecast_type: f.forecastType,
    forecast_period_days: f.periodDays,
    predicted_value: f.predictedTotal,
    confidence_lower: f.confidenceLower,
    confidence_upper: f.confidenceUpper,
    confidence_level: f.confidenceLevel,
    historical_data_points: f.historicalDataPoints,
    model_version: f.modelVersion,
    generated_at: new Date().toISOString(),
  }))

  if (dbRecords.length > 0) {
    await supabase.from('campaign_forecasts').insert(dbRecords)
  }

  return NextResponse.json({
    forecasts,
    hasData: forecasts.length > 0,
    generatedAt: new Date().toISOString(),
  })
}
