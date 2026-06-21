/**
 * Meta/Facebook Ads API Client
 * Official Graph API integration
 */

import { logger } from '../logger'
import { retryWithBackoff, ExternalAPIError } from '../error-handler'

const META_API_VERSION = 'v19.0'
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`

export interface MetaAPIResponse<T = any> {
  data: T
  paging?: {
    cursors?: {
      before: string
      after: string
    }
    next?: string
    previous?: string
  }
  error?: {
    message: string
    type: string
    code: number
    error_subcode?: number
    fbtrace_id: string
  }
}

export class MetaAPIClient {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  /**
   * Make authenticated request to Meta API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<MetaAPIResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${META_API_BASE}${endpoint}`

    return retryWithBackoff(
      async () => {
        logger.debug('Meta API request', { endpoint, method: options.method || 'GET' })

        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        })

        const data = await response.json()

        if (!response.ok || data.error) {
          const error = data.error || {}
          throw new ExternalAPIError(
            'Meta API',
            error.message || 'API request failed',
            {
              code: error.code,
              type: error.type,
              subcode: error.error_subcode,
              trace: error.fbtrace_id,
              status: response.status,
            }
          )
        }

        return data
      },
      {
        maxAttempts: 3,
        initialDelay: 1000,
        onRetry: (attempt, error) => {
          logger.warn('Meta API retry', { attempt, error: error.message, endpoint })
        },
      }
    )
  }

  /**
   * Get current user info
   */
  async getMe(fields: string[] = ['id', 'name', 'email']): Promise<any> {
    const response = await this.request(
      `/me?fields=${fields.join(',')}&access_token=${this.accessToken}`
    )
    return response.data || response
  }

  /**
   * Get user's business managers
   */
  async getBusinessManagers(): Promise<any[]> {
    const response = await this.request<any[]>(
      `/me/businesses?fields=id,name,profile_picture_uri&access_token=${this.accessToken}`
    )
    return response.data || []
  }

  /**
   * Get ad accounts for a business manager
   */
  async getAdAccounts(businessId?: string): Promise<any[]> {
    const endpoint = businessId
      ? `/${businessId}/adaccounts`
      : '/me/adaccounts'

    const fields = [
      'id',
      'name',
      'account_status',
      'currency',
      'timezone_name',
      'amount_spent',
      'balance',
    ]

    const response = await this.request<any[]>(
      `${endpoint}?fields=${fields.join(',')}&access_token=${this.accessToken}`
    )

    return response.data || []
  }

  /**
   * Get campaigns for an ad account
   */
  async getCampaigns(adAccountId: string, params: {
    limit?: number
    after?: string
    fields?: string[]
  } = {}): Promise<MetaAPIResponse<any[]>> {
    const {
      limit = 100,
      after,
      fields = [
        'id',
        'name',
        'objective',
        'status',
        'effective_status',
        'buying_type',
        'budget_remaining',
        'daily_budget',
        'lifetime_budget',
        'start_time',
        'stop_time',
        'created_time',
        'updated_time',
      ],
    } = params

    let url = `/${adAccountId}/campaigns?fields=${fields.join(',')}&limit=${limit}&access_token=${this.accessToken}`
    
    if (after) {
      url += `&after=${after}`
    }

    return this.request<any[]>(url)
  }

  /**
   * Get ad sets for a campaign
   */
  async getAdSets(campaignId: string, params: {
    limit?: number
    after?: string
  } = {}): Promise<MetaAPIResponse<any[]>> {
    const { limit = 100, after } = params

    const fields = [
      'id',
      'name',
      'campaign_id',
      'status',
      'effective_status',
      'optimization_goal',
      'billing_event',
      'bid_strategy',
      'daily_budget',
      'lifetime_budget',
      'targeting',
      'start_time',
      'end_time',
    ]

    let url = `/${campaignId}/adsets?fields=${fields.join(',')}&limit=${limit}&access_token=${this.accessToken}`
    
    if (after) {
      url += `&after=${after}`
    }

    return this.request<any[]>(url)
  }

  /**
   * Get ads for an ad set
   */
  async getAds(adSetId: string, params: {
    limit?: number
    after?: string
  } = {}): Promise<MetaAPIResponse<any[]>> {
    const { limit = 100, after } = params

    const fields = [
      'id',
      'name',
      'adset_id',
      'campaign_id',
      'status',
      'effective_status',
      'creative',
    ]

    let url = `/${adSetId}/ads?fields=${fields.join(',')}&limit=${limit}&access_token=${this.accessToken}`
    
    if (after) {
      url += `&after=${after}`
    }

    return this.request<any[]>(url)
  }

  /**
   * Get insights for an entity (account, campaign, adset, ad)
   */
  async getInsights(entityId: string, params: {
    datePreset?: 'today' | 'yesterday' | 'last_7d' | 'last_30d' | 'lifetime'
    timeRange?: { since: string; until: string }
    level?: 'account' | 'campaign' | 'adset' | 'ad'
    limit?: number
    after?: string
  } = {}): Promise<MetaAPIResponse<any[]>> {
    const {
      datePreset = 'last_30d',
      timeRange,
      level,
      limit = 100,
      after,
    } = params

    const fields = [
      'impressions',
      'clicks',
      'unique_clicks',
      'spend',
      'reach',
      'frequency',
      'cpm',
      'cpc',
      'ctr',
      'actions',
      'action_values',
      'purchase_roas',
      'cost_per_action_type',
    ]

    let url = `/${entityId}/insights?fields=${fields.join(',')}&limit=${limit}&access_token=${this.accessToken}`

    if (datePreset && !timeRange) {
      url += `&date_preset=${datePreset}`
    }

    if (timeRange) {
      url += `&time_range=${JSON.stringify(timeRange)}`
    }

    if (level) {
      url += `&level=${level}`
    }

    if (after) {
      url += `&after=${after}`
    }

    return this.request<any[]>(url)
  }

  /**
   * Get daily insights with date breakdown
   */
  async getDailyInsights(entityId: string, params: {
    since: string // YYYY-MM-DD
    until: string // YYYY-MM-DD
  }): Promise<MetaAPIResponse<any[]>> {
    const { since, until } = params

    const fields = [
      'date_start',
      'date_stop',
      'impressions',
      'clicks',
      'unique_clicks',
      'spend',
      'reach',
      'frequency',
      'cpm',
      'cpc',
      'ctr',
      'actions',
      'action_values',
      'purchase_roas',
    ]

    const url = `/${entityId}/insights?fields=${fields.join(',')}&time_range=${JSON.stringify({ since, until })}&time_increment=1&access_token=${this.accessToken}`

    return this.request<any[]>(url)
  }

  /**
   * Batch request for multiple API calls
   */
  async batch(requests: Array<{ method: string; relative_url: string }>): Promise<any[]> {
    const response = await fetch(`${META_API_BASE}?access_token=${this.accessToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        batch: requests,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new ExternalAPIError('Meta API', 'Batch request failed', data)
    }

    return data
  }

  /**
   * Check token validity
   */
  async debugToken(): Promise<any> {
    const response = await this.request(
      `/debug_token?input_token=${this.accessToken}&access_token=${this.accessToken}`
    )
    return response.data
  }
}

/**
 * Helper to extract actions from insights
 */
export function extractAction(actions: any[], actionType: string): number {
  if (!actions || !Array.isArray(actions)) return 0
  const action = actions.find(a => a.action_type === actionType)
  return action ? parseFloat(action.value) : 0
}

/**
 * Helper to extract action values (revenue)
 */
export function extractActionValue(actionValues: any[], actionType: string): number {
  if (!actionValues || !Array.isArray(actionValues)) return 0
  const actionValue = actionValues.find(a => a.action_type === actionType)
  return actionValue ? parseFloat(actionValue.value) : 0
}

/**
 * Calculate ROAS from insights
 */
export function calculateROAS(insights: any): number {
  const spend = parseFloat(insights.spend || 0)
  const purchaseValue = extractActionValue(insights.action_values || [], 'purchase')
  return spend > 0 ? purchaseValue / spend : 0
}

/**
 * Calculate CPA from insights
 */
export function calculateCPA(insights: any, actionType: string = 'purchase'): number {
  const spend = parseFloat(insights.spend || 0)
  const conversions = extractAction(insights.actions || [], actionType)
  return conversions > 0 ? spend / conversions : 0
}

export default MetaAPIClient
