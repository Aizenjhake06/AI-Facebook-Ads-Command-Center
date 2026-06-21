import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY')!;
const META_APP_ID = Deno.env.get('META_APP_ID')!;
const META_APP_SECRET = Deno.env.get('META_APP_SECRET')!;

// Rate limiting configuration
const RATE_LIMIT_THRESHOLD = 100; // Minimum remaining calls before backing off
const RATE_LIMIT_BACKOFF_MS = 60000; // 1 minute backoff

interface SyncOptions {
  connectionId: string;
  adAccountId?: string;
  entityType: 'all' | 'business_managers' | 'ad_accounts' | 'campaigns' | 'adsets' | 'ads' | 'insights';
  syncType: 'full' | 'incremental' | 'manual' | 'scheduled';
  daysBack?: number; // For insights - how many days back to fetch
}

interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  error?: string;
  rateLimitRemaining?: number;
}

function decrypt(encrypted: string): string {
  const key = ENCRYPTION_KEY;
  const text = atob(encrypted);
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

async function metaApiRequest(
  accessToken: string,
  endpoint: string,
  params: Record<string, string> = {}
): Promise<{ data: any; rateLimitRemaining: number }> {
  const url = new URL(`https://graph.facebook.com/v19.0${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Meta API error');
  }

  // Extract rate limit info from headers if available
  const rateLimitRemaining = parseInt(response.headers.get('x-business-use-case-usage-rate-limit-remaining') || '1000');

  return { data, rateLimitRemaining };
}

async function fetchCampaigns(accessToken: string, adAccountId: string, after?: string): Promise<{ data: any[]; paging: any; rateLimitRemaining: number }> {
  const params: Record<string, string> = {
    fields: 'id,name,objective,status,effective_status,buying_type,budget_remaining,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time',
    limit: '100'
  };
  if (after) params.after = after;

  const result = await metaApiRequest(accessToken, `/${adAccountId}/campaigns`, params);
  return {
    data: result.data.data || [],
    paging: result.data.paging,
    rateLimitRemaining: result.rateLimitRemaining
  };
}

async function fetchAdSets(accessToken: string, campaignId: string, after?: string): Promise<{ data: any[]; paging: any; rateLimitRemaining: number }> {
  const params: Record<string, string> = {
    fields: 'id,name,campaign_id,status,effective_status,optimization_goal,billing_event,bid_strategy,daily_budget,lifetime_budget,targeting,start_time,end_time,created_time,updated_time',
    limit: '100'
  };
  if (after) params.after = after;

  const result = await metaApiRequest(accessToken, `/${campaignId}/adsets`, params);
  return {
    data: result.data.data || [],
    paging: result.data.paging,
    rateLimitRemaining: result.rateLimitRemaining
  };
}

async function fetchAds(accessToken: string, adSetId: string, after?: string): Promise<{ data: any[]; paging: any; rateLimitRemaining: number }> {
  const params: Record<string, string> = {
    fields: 'id,name,adset_id,campaign_id,status,effective_status,creative,display_format,created_time,updated_time',
    limit: '100'
  };
  if (after) params.after = after;

  const result = await metaApiRequest(accessToken, `/${adSetId}/ads`, params);
  return {
    data: result.data.data || [],
    paging: result.data.paging,
    rateLimitRemaining: result.rateLimitRemaining
  };
}

async function fetchInsights(
  accessToken: string,
  entityId: string,
  dateRange: { start: string; end: string },
  level: 'account' | 'campaign' | 'adset' | 'ad'
): Promise<{ data: any[]; rateLimitRemaining: number }> {
  const params: Record<string, string> = {
    fields: 'impressions,clicks,unique_clicks,spend,reach,frequency,cpm,cpc,ctr,actions,conversions,conversion_value,cost_per_conversion,purchase_roas,purchases,purchase_value,date_start,date_stop',
    date_preset: 'last_30d',
    level: level,
    time_range: JSON.stringify({ since: dateRange.start, until: dateRange.end }),
    limit: '100'
  };

  const result = await metaApiRequest(accessToken, `/${entityId}/insights`, params);
  return {
    data: result.data.data || [],
    rateLimitRemaining: result.rateLimitRemaining
  };
}

async function createSyncLog(supabase: any, options: SyncOptions): Promise<string> {
  const { data, error } = await supabase
    .from('meta_sync_logs')
    .insert({
      meta_connection_id: options.connectionId,
      ad_account_id: options.adAccountId,
      sync_type: options.syncType,
      entity_type: options.entityType,
      status: 'running',
      started_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

async function updateSyncLog(supabase: any, logId: string, updates: Partial<any>) {
  await supabase
    .from('meta_sync_logs')
    .update({
      ...updates,
      completed_at: updates.status === 'completed' || updates.status === 'failed' ? new Date().toISOString() : undefined,
      duration_seconds: updates.status === 'completed' || updates.status === 'failed'
        ? Math.floor((new Date().getTime() - new Date(updates.started_at || Date.now()).getTime()) / 1000)
        : undefined
    })
    .eq('id', logId);
}

async function upsertCampaigns(supabase: any, connectionId: string, adAccountId: string, campaigns: any[]) {
  const records = campaigns.map(c => ({
    meta_connection_id: connectionId,
    ad_account_id: adAccountId,
    campaign_id: c.id,
    name: c.name || 'Unnamed Campaign',
    objective: c.objective,
    status: c.status,
    effective_status: c.effective_status,
    buying_type: c.buying_type,
    budget_remaining: parseFloat(c.budget_remaining) || 0,
    daily_budget: parseFloat(c.daily_budget) || 0,
    lifetime_budget: parseFloat(c.lifetime_budget) || 0,
    start_time: c.start_time,
    stop_time: c.stop_time,
    last_synced_at: new Date().toISOString()
  }));

  if (records.length === 0) return;

  await supabase
    .from('meta_campaigns')
    .upsert(records, { onConflict: 'ad_account_id,campaign_id' });
}

async function upsertAdSets(supabase: any, connectionId: string, adAccountId: string, adSets: any[], campaignMap: Map<string, string>) {
  const records = adSets.map(as => ({
    meta_connection_id: connectionId,
    ad_account_id: adAccountId,
    campaign_id: campaignMap.get(as.campaign_id),
    adset_id: as.id,
    name: as.name || 'Unnamed Ad Set',
    campaign_id_meta: as.campaign_id,
    status: as.status,
    effective_status: as.effective_status,
    optimization_goal: as.optimization_goal,
    billing_event: as.billing_event,
    bid_strategy: as.bid_strategy,
    daily_budget: parseFloat(as.daily_budget) || 0,
    lifetime_budget: parseFloat(as.lifetime_budget) || 0,
    targeting: as.targeting,
    start_time: as.start_time,
    end_time: as.end_time,
    last_synced_at: new Date().toISOString()
  })).filter(r => r.campaign_id); // Only insert if we have the campaign FK

  if (records.length === 0) return;

  await supabase
    .from('meta_ad_sets')
    .upsert(records, { onConflict: 'ad_account_id,adset_id' });
}

async function upsertAds(supabase: any, connectionId: string, adAccountId: string, ads: any[], campaignMap: Map<string, string>, adSetMap: Map<string, string>) {
  const records = ads.map(ad => ({
    meta_connection_id: connectionId,
    ad_account_id: adAccountId,
    campaign_id: campaignMap.get(ad.campaign_id),
    ad_set_id: adSetMap.get(ad.adset_id),
    ad_id: ad.id,
    name: ad.name || 'Unnamed Ad',
    adset_id_meta: ad.adset_id,
    campaign_id_meta: ad.campaign_id,
    status: ad.status,
    effective_status: ad.effective_status,
    creative: ad.creative,
    display_format: ad.display_format,
    last_synced_at: new Date().toISOString()
  })).filter(r => r.campaign_id && r.ad_set_id);

  if (records.length === 0) return;

  await supabase
    .from('meta_ads')
    .upsert(records, { onConflict: 'ad_account_id,ad_id' });
}

async function upsertInsights(supabase: any, connectionId: string, adAccountId: string, insights: any[], entityType: string, entityMetaId: string) {
  const records = insights.map(ins => ({
    meta_connection_id: connectionId,
    ad_account_id: adAccountId,
    entity_type: entityType,
    entity_id_meta: entityMetaId,
    date: ins.date_start,
    impressions: parseInt(ins.impressions) || 0,
    clicks: parseInt(ins.clicks) || 0,
    unique_clicks: parseInt(ins.unique_clicks) || 0,
    spend: parseFloat(ins.spend) || 0,
    reach: parseInt(ins.reach) || 0,
    frequency: parseFloat(ins.frequency) || 0,
    cpm: parseFloat(ins.cpm) || 0,
    cpc: parseFloat(ins.cpc) || 0,
    ctr: parseFloat(ins.ctr) || 0,
    actions: ins.actions,
    conversions: parseInt(ins.conversions) || 0,
    conversion_value: parseFloat(ins.conversion_value) || 0,
    cost_per_conversion: parseFloat(ins.cost_per_conversion) || 0,
    roas: parseFloat(ins.purchase_roas) || 0,
    purchases: parseInt(ins.purchases) || 0,
    purchase_value: parseFloat(ins.purchase_value) || 0,
    last_synced_at: new Date().toISOString()
  }));

  if (records.length === 0) return;

  await supabase
    .from('meta_insights')
    .upsert(records, { onConflict: 'entity_type,entity_id_meta,date' });
}

async function updateSyncState(supabase: any, connectionId: string, adAccountId: string | undefined, entityType: string, success: boolean, logId: string) {
  await supabase
    .from('meta_sync_state')
    .upsert({
      meta_connection_id: connectionId,
      ad_account_id: adAccountId,
      entity_type: entityType,
      last_sync_at: new Date().toISOString(),
      last_successful_sync_at: success ? new Date().toISOString() : undefined,
      last_sync_log_id: logId,
      error_count: success ? 0 : undefined,
      updated_at: new Date().toISOString()
    }, { onConflict: 'meta_connection_id,ad_account_id,entity_type' });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const options: SyncOptions = body;

    const { connectionId, adAccountId, entityType, syncType, daysBack } = options;

    // Get connection and decrypt token
    const { data: connection, error: connError } = await supabase
      .from('meta_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      throw new Error('Connection not found');
    }

    const accessToken = decrypt(connection.encrypted_access_token);

    // Create sync log
    const logId = await createSyncLog(supabase, options);

    let processedCount = 0;
    let failedCount = 0;
    let rateLimitRemaining = 1000;

    try {
      // Process based on entity type
      if (entityType === 'all' || entityType === 'campaigns') {
        // Fetch ad accounts for this connection
        const { data: adAccounts } = await supabase
          .from('meta_ad_accounts')
          .select('id, ad_account_id')
          .eq('meta_connection_id', connectionId);

        for (const account of adAccounts || []) {
          // Fetch and store campaigns
          let after: string | undefined;
          let hasMore = true;

          while (hasMore) {
            // Rate limit check
            if (rateLimitRemaining < RATE_LIMIT_THRESHOLD) {
              await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_BACKOFF_MS));
            }

            const result = await fetchCampaigns(accessToken, account.ad_account_id, after);
            rateLimitRemaining = result.rateLimitRemaining;

            if (result.data.length > 0) {
              await upsertCampaigns(supabase, connectionId, account.id, result.data);
              processedCount += result.data.length;
            }

            if (result.paging?.cursors?.after) {
              after = result.paging.cursors.after;
            } else {
              hasMore = false;
            }
          }
        }

        await updateSyncState(supabase, connectionId, undefined, 'campaigns', true, logId);
      }

      if (entityType === 'all' || entityType === 'adsets') {
        // Get all campaigns
        const { data: campaigns } = await supabase
          .from('meta_campaigns')
          .select('id, campaign_id, ad_account_id')
          .eq('meta_connection_id', connectionId);

        const campaignMap = new Map(campaigns?.map(c => [c.campaign_id, c.id]) || []);

        for (const campaign of campaigns || []) {
          let after: string | undefined;
          let hasMore = true;

          while (hasMore) {
            if (rateLimitRemaining < RATE_LIMIT_THRESHOLD) {
              await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_BACKOFF_MS));
            }

            try {
              const result = await fetchAdSets(accessToken, campaign.campaign_id, after);
              rateLimitRemaining = result.rateLimitRemaining;

              if (result.data.length > 0) {
                await upsertAdSets(supabase, connectionId, campaign.ad_account_id, result.data, campaignMap);
                processedCount += result.data.length;
              }

              if (result.paging?.cursors?.after) {
                after = result.paging.cursors.after;
              } else {
                hasMore = false;
              }
            } catch (e) {
              failedCount++;
              hasMore = false;
            }
          }
        }

        await updateSyncState(supabase, connectionId, undefined, 'adsets', true, logId);
      }

      if (entityType === 'all' || entityType === 'ads') {
        // Get all ad sets
        const { data: adSets } = await supabase
          .from('meta_ad_sets')
          .select('id, adset_id, ad_account_id, campaign_id, campaign_id_meta')
          .eq('meta_connection_id', connectionId);

        const campaignMap = new Map<string, string>();
        const adSetMap = new Map(adSets?.map(as => [as.adset_id, as.id]) || []);

        // Get campaign FK mapping
        const { data: campaigns } = await supabase
          .from('meta_campaigns')
          .select('id, campaign_id')
          .eq('meta_connection_id', connectionId);
        campaigns?.forEach(c => campaignMap.set(c.campaign_id, c.id));

        for (const adSet of adSets || []) {
          let after: string | undefined;
          let hasMore = true;

          while (hasMore) {
            if (rateLimitRemaining < RATE_LIMIT_THRESHOLD) {
              await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_BACKOFF_MS));
            }

            try {
              const result = await fetchAds(accessToken, adSet.adset_id, after);
              rateLimitRemaining = result.rateLimitRemaining;

              if (result.data.length > 0) {
                await upsertAds(supabase, connectionId, adSet.ad_account_id, result.data, campaignMap, adSetMap);
                processedCount += result.data.length;
              }

              if (result.paging?.cursors?.after) {
                after = result.paging.cursors.after;
              } else {
                hasMore = false;
              }
            } catch (e) {
              failedCount++;
              hasMore = false;
            }
          }
        }

        await updateSyncState(supabase, connectionId, undefined, 'ads', true, logId);
      }

      if (entityType === 'all' || entityType === 'insights') {
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - (daysBack || 30));

        const dateRange = {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        };

        // Get all ad accounts
        const { data: adAccounts } = await supabase
          .from('meta_ad_accounts')
          .select('id, ad_account_id')
          .eq('meta_connection_id', connectionId);

        for (const account of adAccounts || []) {
          if (rateLimitRemaining < RATE_LIMIT_THRESHOLD) {
            await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_BACKOFF_MS));
          }

          try {
            const result = await fetchInsights(accessToken, account.ad_account_id, dateRange, 'account');
            rateLimitRemaining = result.rateLimitRemaining;

            if (result.data.length > 0) {
              await upsertInsights(supabase, connectionId, account.id, result.data, 'account', account.ad_account_id);
              processedCount += result.data.length;
            }
          } catch (e) {
            failedCount++;
          }
        }

        await updateSyncState(supabase, connectionId, undefined, 'insights', true, logId);
      }

      // Update sync log as completed
      await updateSyncLog(supabase, logId, {
        status: failedCount > 0 ? 'partial' : 'completed',
        total_records: processedCount,
        processed_records: processedCount,
        failed_records: failedCount,
        rate_limit_remaining: rateLimitRemaining
      });

      return new Response(JSON.stringify({
        success: true,
        processed: processedCount,
        failed: failedCount,
        rateLimitRemaining
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (syncError: any) {
      await updateSyncLog(supabase, logId, {
        status: 'failed',
        error_message: syncError.message,
        total_records: processedCount,
        processed_records: processedCount,
        failed_records: failedCount
      });

      throw syncError;
    }

  } catch (error: any) {
    console.error('Sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
