import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { report_id, expires_in_days, password } = body

  if (!report_id) {
    return NextResponse.json({ error: 'report_id is required' }, { status: 400 })
  }

  // Verify report ownership
  const { data: report } = await supabase
    .from('campaign_reports')
    .select('workspace_id, user_id')
    .eq('id', report_id)
    .single()

  if (!report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  if (report.user_id !== user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const token = randomBytes(32).toString('hex')
  const expiresAt = expires_in_days
    ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
    : null

  const { data: shareable, error } = await supabase
    .from('shareable_reports')
    .insert({
      report_id,
      token,
      password_hash: password || null,
      expires_at: expiresAt,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    shareUrl: `/api/reports/share/${token}`,
    token,
    expiresAt,
  })
}
