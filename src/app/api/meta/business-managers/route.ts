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

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  // Verify user has access to this workspace
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Get all connections for this workspace
  const { data: connections } = await supabase
    .from('meta_connections')
    .select('id')
    .eq('workspace_id', workspaceId)

  if (!connections || connections.length === 0) {
    return NextResponse.json({ data: [] })
  }

  const connectionIds = connections.map(c => c.id)

  // Get business managers
  const { data: businessManagers, error } = await supabase
    .from('meta_business_managers')
    .select('id, business_manager_id, name, profile_picture_url, is_active')
    .in('meta_connection_id', connectionIds)
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('Business managers query error:', error)
    return NextResponse.json({ data: [] })
  }

  return NextResponse.json({ data: businessManagers || [] })
}
