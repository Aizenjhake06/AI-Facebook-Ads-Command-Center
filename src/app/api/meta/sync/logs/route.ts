import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const connectionId = searchParams.get('connection_id')
  const adAccountId = searchParams.get('ad_account_id')
  const limit = parseInt(searchParams.get('limit') || '20')

  if (!connectionId) {
    return NextResponse.json({ error: 'connection_id is required' }, { status: 400 })
  }

  // Verify access
  const { data: connection } = await supabase
    .from('meta_connections')
    .select('workspace_id')
    .eq('id', connectionId)
    .single()

  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', connection.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Fetch sync logs
  let query = supabase
    .from('meta_sync_logs')
    .select('*')
    .eq('meta_connection_id', connectionId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (adAccountId) {
    query = query.eq('ad_account_id', adAccountId)
  }

  const { data: logs, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch sync state
  const { data: syncState } = await supabase
    .from('meta_sync_state')
    .select('*')
    .eq('meta_connection_id', connectionId)

  return NextResponse.json({
    logs,
    syncState
  })
}
