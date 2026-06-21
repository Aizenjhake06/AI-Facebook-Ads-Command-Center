import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { status } = body

  if (!status || !['applied', 'dismissed', 'expired'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Get the recommendation to check workspace access
  const { data: rec } = await supabase
    .from('campaign_recommendations')
    .select('workspace_id')
    .eq('id', id)
    .single()

  if (!rec) {
    return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })
  }

  // Verify access
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', rec.workspace_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const updates: any = { status }
  if (status === 'applied') {
    updates.applied_at = new Date().toISOString()
  } else if (status === 'dismissed') {
    updates.dismissed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('campaign_recommendations')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
