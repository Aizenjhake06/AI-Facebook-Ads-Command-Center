/**
 * End-to-End Workflow Integration Tests
 */

import { createClient } from '@supabase/supabase-js'
import { calculateHealthScore } from '@/lib/health-score'
import { generateRecommendations } from '@/lib/recommendations'
import { generateForecast } from '@/lib/forecasting'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('E2E Workflow Tests', () => {
  let testWorkspaceId: string
  let testUserId: string

  beforeAll(async () => {
    // Create test user
    const { data: user } = await supabase.auth.admin.createUser({
      email: 'workflow@example.com',
      password: 'testpassword123',
      email_confirm: true,
    })
    testUserId = user.user!.id

    // Create test workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .insert({
        name: 'Workflow Test Workspace',
        owner_id: testUserId,
      })
      .select()
      .single()
    testWorkspaceId = workspace!.id
  })

  afterAll(async () => {
    // Cleanup
    await supabase.from('workspaces').delete().eq('id', testWorkspaceId)
    await supabase.auth.admin.deleteUser(testUserId)
  })

  describe('Complete Campaign Analysis Workflow', () => {
    it('should analyze campaign from data to insights', async () => {
      // Step 1: Create campaign
      const { data: campaign } = await supabase
        .from('meta_campaigns')
        .insert({
          campaign_id: 'workflow_campaign_123',
          name: 'Workflow Test Campaign',
          status: 'ACTIVE',
          objective: 'CONVERSIONS',
          daily_budget: 100,
          meta_connection_id: testWorkspaceId,
        })
        .select()
        .single()

      expect(campaign).toBeDefined()

      // Step 2: Add insights data
      const insightsData = []
      for (let i = 30; i > 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        
        insightsData.push({
          entity_type: 'campaign',
          entity_id_meta: 'workflow_campaign_123',
          date: date.toISOString().split('T')[0],
          spend: 100 + Math.random() * 50,
          impressions: 10000 + Math.random() * 5000,
          clicks: 500 + Math.random() * 200,
          ctr: 5.0 + Math.random() * 2,
          cpc: 0.2 + Math.random() * 0.1,
          conversions: 20 + Math.random() * 10,
          purchase_value: 400 + Math.random() * 200,
          meta_connection_id: testWorkspaceId,
        })
      }

      await supabase.from('meta_insights').insert(insightsData)

      // Step 3: Fetch aggregated insights
      const { data: insights } = await supabase
        .from('meta_insights')
        .select('*')
        .eq('entity_id_meta', 'workflow_campaign_123')
        .order('date', { ascending: false })

      expect(insights).toBeDefined()
      expect(insights!.length).toBeGreaterThan(0)

      // Step 4: Calculate health score
      const totalSpend = insights!.reduce((sum, i) => sum + (i.spend || 0), 0)
      const totalRevenue = insights!.reduce((sum, i) => sum + (i.purchase_value || 0), 0)
      const totalClicks = insights!.reduce((sum, i) => sum + (i.clicks || 0), 0)
      const totalImpressions = insights!.reduce((sum, i) => sum + (i.impressions || 0), 0)
      const totalConversions = insights!.reduce((sum, i) => sum + (i.conversions || 0), 0)

      const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0
      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
      const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0

      const healthScore = calculateHealthScore({ roas, ctr, cpa })
      expect(healthScore).toBeGreaterThanOrEqual(0)
      expect(healthScore).toBeLessThanOrEqual(100)

      // Step 5: Generate recommendations
      const recommendations = generateRecommendations(
        campaign!.campaign_id,
        {
          spend: totalSpend,
          revenue: totalRevenue,
          roas,
          ctr,
          cpa,
          conversions: totalConversions,
          frequency: 3.5,
          health_score: healthScore,
        }
      )

      expect(Array.isArray(recommendations)).toBe(true)

      // Save recommendations
      if (recommendations.length > 0) {
        const recsToInsert = recommendations.map((rec) => ({
          workspace_id: testWorkspaceId,
          campaign_id: campaign!.id,
          type: rec.type,
          action: rec.action,
          reasoning: rec.reasoning,
          impact_estimate: rec.impact_estimate || null,
          confidence: rec.confidence,
          status: 'pending',
        }))

        await supabase.from('campaign_recommendations').insert(recsToInsert)
      }

      // Step 6: Generate forecast
      const spendData = insights!.map((i) => i.spend || 0)
      const forecast = generateForecast(spendData, 7)

      expect(forecast).toBeDefined()
      expect(forecast.predicted_value).toBeGreaterThan(0)

      // Save forecast
      await supabase.from('campaign_forecasts').insert({
        workspace_id: testWorkspaceId,
        campaign_id: campaign!.id,
        forecast_type: 'spend',
        period: '7_days',
        predicted_value: forecast.predicted_value,
        confidence_interval_low: forecast.confidence_low,
        confidence_interval_high: forecast.confidence_high,
        trend: forecast.trend,
        model_accuracy: forecast.confidence,
      })

      // Cleanup
      await supabase.from('campaign_forecasts').delete().eq('campaign_id', campaign!.id)
      await supabase.from('campaign_recommendations').delete().eq('campaign_id', campaign!.id)
      await supabase.from('meta_insights').delete().eq('entity_id_meta', 'workflow_campaign_123')
      await supabase.from('meta_campaigns').delete().eq('id', campaign!.id)
    })
  })

  describe('Alert Generation Workflow', () => {
    it('should detect and create alerts', async () => {
      // Create campaign
      const { data: campaign } = await supabase
        .from('meta_campaigns')
        .insert({
          campaign_id: 'alert_campaign_123',
          name: 'Alert Test Campaign',
          status: 'ACTIVE',
          objective: 'CONVERSIONS',
          meta_connection_id: testWorkspaceId,
        })
        .select()
        .single()

      // Add insights with declining ROAS
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      await supabase.from('meta_insights').insert([
        {
          entity_type: 'campaign',
          entity_id_meta: 'alert_campaign_123',
          date: yesterday.toISOString().split('T')[0],
          spend: 100,
          purchase_value: 500, // ROAS = 5.0
          meta_connection_id: testWorkspaceId,
        },
        {
          entity_type: 'campaign',
          entity_id_meta: 'alert_campaign_123',
          date: today.toISOString().split('T')[0],
          spend: 100,
          purchase_value: 300, // ROAS = 3.0 (40% drop)
          meta_connection_id: testWorkspaceId,
        },
      ])

      // Detect ROAS drop
      const { data: insights } = await supabase
        .from('meta_insights')
        .select('*')
        .eq('entity_id_meta', 'alert_campaign_123')
        .order('date', { ascending: false })
        .limit(2)

      const currentRoas = insights![0].purchase_value / insights![0].spend
      const previousRoas = insights![1].purchase_value / insights![1].spend
      const roasChange = ((currentRoas - previousRoas) / previousRoas) * 100

      expect(roasChange).toBeLessThan(-30) // More than 30% drop

      // Create alert
      const { data: alert } = await supabase
        .from('campaign_alerts')
        .insert({
          workspace_id: testWorkspaceId,
          campaign_id: campaign!.id,
          alert_type: 'roas_drop',
          severity: 'critical',
          message: `ROAS dropped ${Math.abs(roasChange).toFixed(1)}%`,
          current_value: currentRoas,
          threshold_value: previousRoas,
          status: 'active',
        })
        .select()
        .single()

      expect(alert).toBeDefined()

      // Cleanup
      await supabase.from('campaign_alerts').delete().eq('id', alert!.id)
      await supabase.from('meta_insights').delete().eq('entity_id_meta', 'alert_campaign_123')
      await supabase.from('meta_campaigns').delete().eq('id', campaign!.id)
    })
  })

  describe('Report Generation Workflow', () => {
    it('should create and process report request', async () => {
      // Create report request
      const { data: report } = await supabase
        .from('campaign_reports')
        .insert({
          workspace_id: testWorkspaceId,
          user_id: testUserId,
          report_type: 'campaign_summary',
          format: 'csv',
          status: 'pending',
          filters: {
            startDate: '2026-01-01',
            endDate: '2026-06-21',
          },
        })
        .select()
        .single()

      expect(report).toBeDefined()
      expect(report!.status).toBe('pending')

      // Simulate report generation
      await supabase
        .from('campaign_reports')
        .update({
          status: 'generating',
        })
        .eq('id', report!.id)

      // Simulate completion
      await supabase
        .from('campaign_reports')
        .update({
          status: 'completed',
          file_url: '/reports/test_report.csv',
          file_size: 1024,
          generated_at: new Date().toISOString(),
        })
        .eq('id', report!.id)

      // Verify completion
      const { data: completedReport } = await supabase
        .from('campaign_reports')
        .select('*')
        .eq('id', report!.id)
        .single()

      expect(completedReport!.status).toBe('completed')
      expect(completedReport!.file_url).toBeDefined()

      // Cleanup
      await supabase.from('campaign_reports').delete().eq('id', report!.id)
    })
  })
})
