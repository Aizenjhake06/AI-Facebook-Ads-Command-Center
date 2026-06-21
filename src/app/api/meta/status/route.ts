import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
  const connectionId = searchParams.get('connection_id')

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

  // Build query
  let connectionQuery = supabase
    .from('meta_connections')
    .select(`
      *,
      business_managers:meta_business_managers(
        id,
        business_manager_id,
        name,
        profile_picture_url,
        is_active
      ),
      ad_accounts:meta_ad_accounts(
        id,
        ad_account_id,
        name,
        account_status,
        currency,
        amount_spent,
        balance,
        is_active
      )
    `)
    .eq('workspace_id', workspaceId)

  if (connectionId) {
    connectionQuery = connectionQuery.eq('id', connectionId)
  }

  const { data: connections, error: connError } = await connectionQuery

  if (connError) {
    return NextResponse.json({ error: connError.message }, { status: 500 })
  }

  // Get campaign counts for each connection
  const connectionsWithStats = await Promise.all(
    (connections || []).map(async (conn) => {
      const [campaignCount, adSetCount, adCount] = await Promise.all([
        supabase.from('meta_campaigns').select('id', { count: 'exact', head: true }).eq('meta_connection_id', conn.id),
        supabase.from('meta_ad_sets').select('id', { count: 'exact', head: true }).eq('meta_connection_id', conn.id),
        supabase.from('meta_ads').select('id', { count: 'exact', head: true }).eq('meta_connection_id', conn.id)
      ])

      return {
        ...conn,
        stats: {
          campaigns: campaignCount.count || 0,
          adsets: adSetCount.count || 0,
          ads: adCount.count || 0
        }
      }
    })
  )

  return NextResponse.json(connectionsWithStats)
}
