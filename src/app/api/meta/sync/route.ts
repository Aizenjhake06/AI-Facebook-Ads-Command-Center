import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { connectionId, adAccountId, entityType, syncType, daysBack } = body

  if (!connectionId) {
    return NextResponse.json({ error: 'connectionId is required' }, { status: 400 })
  }

  // Verify user has access to this connection's workspace
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

  // Call the edge function to perform sync
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const response = await fetch(`${supabaseUrl}/functions/v1/meta-sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      connectionId,
      adAccountId,
      entityType: entityType || 'all',
      syncType: syncType || 'manual',
      daysBack: daysBack || 30
    })
  })

  const data = await response.json()

  if (!response.ok) {
    return NextResponse.json({ error: data.error || 'Sync failed' }, { status: 500 })
  }

  return NextResponse.json(data)
}
