import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createViewRequestSchema, validateBody, formatZodError, uuidSchema, sanitizeString } from '@/lib/validation'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
  const viewType = searchParams.get('view_type')

  if (!workspaceId) {
    return NextResponse.json({ error: 'workspace_id is required' }, { status: 400 })
  }

  const uuidValidation = uuidSchema.safeParse(workspaceId)
  if (!uuidValidation.success) {
    return NextResponse.json({ error: 'Invalid workspace_id format' }, { status: 400 })
  }

  // Verify access
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  let query = supabase
    .from('saved_views')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (viewType) {
    query = query.eq('view_type', viewType)
  }

  const { data: views, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(views)
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const validation = validateBody(createViewRequestSchema, body)

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: formatZodError(validation.error) },
      { status: 400 }
    )
  }

  const { workspace_id, name, view_type, columns, filters, sort_by, sort_order, is_default } = validation.data
  const sanitizedName = sanitizeString(name)

  // Verify access
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('saved_views')
    .insert({
      workspace_id,
      user_id: user.id,
      name: sanitizedName,
      view_type,
      columns,
      filters,
      sort_by,
      sort_order,
      is_default
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
