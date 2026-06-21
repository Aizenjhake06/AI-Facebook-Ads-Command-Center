import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const supabase = await createClient()
  const { token } = await params

  const { data: shareable } = await supabase
    .from('shareable_reports')
    .select('*, report:campaign_reports(*)')
    .eq('token', token)
    .single()

  if (!shareable) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 })
  }

  if (shareable.expires_at && new Date(shareable.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Report link expired' }, { status: 410 })
  }

  // Increment access count
  await supabase.from('shareable_reports').update({
    access_count: (shareable.access_count || 0) + 1,
    last_accessed_at: new Date().toISOString(),
  }).eq('id', shareable.id)

  return NextResponse.json({
    report: shareable.report,
  })
}
