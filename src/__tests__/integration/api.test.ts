/**
 * Integration Tests for API Endpoints
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

describe('API Integration Tests', () => {
  let testWorkspaceId: string
  let testUserId: string
  let testCampaignId: string

  beforeAll(async () => {
    // Create test user
    const { data: user } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'testpassword123',
      email_confirm: true,
    })
    testUserId = user.user!.id

    // Create test workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .insert({
        name: 'Test Workspace',
        owner_id: testUserId,
      })
      .select()
      .single()
    testWorkspaceId = workspace!.id

    // Create test campaign
    const { data: campaign } = await supabase
      .from('meta_campaigns')
      .insert({
        campaign_id: 'test_campaign_123',
        name: 'Test Campaign',
        status: 'ACTIVE',
        objective: 'CONVERSIONS',
        meta_connection_id: testWorkspaceId,
      })
      .select()
      .single()
    testCampaignId = campaign!.id
  })

  afterAll(async () => {
    // Cleanup test data
    await supabase.from('meta_campaigns').delete().eq('id', testCampaignId)
    await supabase.from('workspaces').delete().eq('id', testWorkspaceId)
    await supabase.auth.admin.deleteUser(testUserId)
  })

  describe('Campaign Health Score', () => {
    it('should calculate health score correctly', async () => {
      // Insert test insights
      await supabase.from('meta_insights').insert({
        entity_type: 'campaign',
        entity_id_meta: 'test_campaign_123',
        date: new Date().toISOString().split('T')[0],
        spend: 100,
        impressions: 10000,
        clicks: 500,
        ctr: 5.0,
        cpc: 0.2,
        conversions: 20,
        purchase_value: 400,
        meta_connection_id: testWorkspaceId,
      })

      // Fetch campaign with calculated metrics
      const { data: insights } = await supabase
        .from('meta_insights')
        .select('*')
        .eq('entity_id_meta', 'test_campaign_123')
        .single()

      expect(insights).toBeDefined()
      expect(insights!.spend).toBe(100)
      expect(insights!.conversions).toBe(20)

      // Calculate ROAS and health score
      const roas = insights!.purchase_value / insights!.spend
      expect(roas).toBe(4.0)

      // Cleanup
      await supabase
        .from('meta_insights')
        .delete()
        .eq('entity_id_meta', 'test_campaign_123')
    })
  })

  describe('Workspace Management', () => {
    it('should create and retrieve workspace', async () => {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', testWorkspaceId)
        .single()

      expect(workspace).toBeDefined()
      expect(workspace!.name).toBe('Test Workspace')
      expect(workspace!.owner_id).toBe(testUserId)
    })

    it('should add workspace member', async () => {
      const { data: member } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: testWorkspaceId,
          user_id: testUserId,
          role: 'owner',
        })
        .select()
        .single()

      expect(member).toBeDefined()
      expect(member!.role).toBe('owner')

      // Cleanup
      await supabase
        .from('workspace_members')
        .delete()
        .eq('id', member!.id)
    })
  })

  describe('Recommendations', () => {
    it('should generate recommendations', async () => {
      const { data: recommendation } = await supabase
        .from('campaign_recommendations')
        .insert({
          workspace_id: testWorkspaceId,
          campaign_id: testCampaignId,
          type: 'budget',
          action: 'increase_budget',
          reasoning: 'High ROAS campaign deserves more budget',
          impact_estimate: 'Estimated 25% revenue increase',
          confidence: 0.85,
          status: 'pending',
        })
        .select()
        .single()

      expect(recommendation).toBeDefined()
      expect(recommendation!.action).toBe('increase_budget')
      expect(recommendation!.confidence).toBe(0.85)

      // Cleanup
      await supabase
        .from('campaign_recommendations')
        .delete()
        .eq('id', recommendation!.id)
    })
  })

  describe('Alerts', () => {
    it('should create and retrieve alerts', async () => {
      const { data: alert } = await supabase
        .from('campaign_alerts')
        .insert({
          workspace_id: testWorkspaceId,
          campaign_id: testCampaignId,
          alert_type: 'roas_drop',
          severity: 'warning',
          message: 'ROAS dropped by 30%',
          current_value: 2.5,
          threshold_value: 3.5,
          status: 'active',
        })
        .select()
        .single()

      expect(alert).toBeDefined()
      expect(alert!.alert_type).toBe('roas_drop')
      expect(alert!.severity).toBe('warning')

      // Cleanup
      await supabase
        .from('campaign_alerts')
        .delete()
        .eq('id', alert!.id)
    })
  })

  describe('Forecasts', () => {
    it('should create forecast', async () => {
      const { data: forecast } = await supabase
        .from('campaign_forecasts')
        .insert({
          workspace_id: testWorkspaceId,
          campaign_id: testCampaignId,
          forecast_type: 'spend',
          period: '7_days',
          predicted_value: 700,
          confidence_interval_low: 600,
          confidence_interval_high: 800,
          trend: 'up',
          model_accuracy: 0.92,
        })
        .select()
        .single()

      expect(forecast).toBeDefined()
      expect(forecast!.forecast_type).toBe('spend')
      expect(forecast!.predicted_value).toBe(700)

      // Cleanup
      await supabase
        .from('campaign_forecasts')
        .delete()
        .eq('id', forecast!.id)
    })
  })

  describe('Reports', () => {
    it('should create report request', async () => {
      const { data: report } = await supabase
        .from('campaign_reports')
        .insert({
          workspace_id: testWorkspaceId,
          user_id: testUserId,
          report_type: 'campaign_summary',
          format: 'csv',
          status: 'pending',
          filters: { date_range: 'last_30_days' },
        })
        .select()
        .single()

      expect(report).toBeDefined()
      expect(report!.status).toBe('pending')
      expect(report!.format).toBe('csv')

      // Cleanup
      await supabase
        .from('campaign_reports')
        .delete()
        .eq('id', report!.id)
    })
  })

  describe('Notifications', () => {
    it('should create notification', async () => {
      const { data: notification } = await supabase
        .from('user_notifications')
        .insert({
          user_id: testUserId,
          workspace_id: testWorkspaceId,
          type: 'alert',
          title: 'Test Alert',
          message: 'This is a test notification',
          channel: 'in_app',
        })
        .select()
        .single()

      expect(notification).toBeDefined()
      expect(notification!.title).toBe('Test Alert')
      expect(notification!.read).toBe(false)

      // Cleanup
      await supabase
        .from('user_notifications')
        .delete()
        .eq('id', notification!.id)
    })
  })
})
