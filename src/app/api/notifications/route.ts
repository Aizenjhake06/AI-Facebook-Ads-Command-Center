import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  createNotificationSchema,
  notificationActionSchema,
  validateBody,
  formatZodError,
  sanitizeString
} from '@/lib/validation'

export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'all'
  const limitParam = searchParams.get('limit') || '50'
  const limit = Math.min(Math.max(1, parseInt(limitParam) || 50), 100)

  let query = supabase
    .from('user_notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status === 'unread') {
    query = query.eq('read', false)
  }

  const { data: notifications, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get unread count
  const { count: unreadCount } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false)

  return NextResponse.json({
    notifications: notifications || [],
    unreadCount: unreadCount || 0,
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const validation = validateBody(createNotificationSchema, body)

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: formatZodError(validation.error) },
      { status: 400 }
    )
  }

  const { workspace_id, type, title, message, data, channel } = validation.data
  const sanitizedTitle = sanitizeString(title)
  const sanitizedMessage = sanitizeString(message)

  const { data: notification, error } = await supabase
    .from('user_notifications')
    .insert({
      user_id: user.id,
      workspace_id,
      type,
      title: sanitizedTitle,
      message: sanitizedMessage,
      data,
      channel,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ notification })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const validation = validateBody(notificationActionSchema, body)

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: formatZodError(validation.error) },
      { status: 400 }
    )
  }

  const { action, ids } = validation.data

  if (action === 'mark_read' && ids && ids.length > 0) {
    const { error } = await supabase
      .from('user_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .in('id', ids)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else if (action === 'mark_all_read') {
    const { error } = await supabase
      .from('user_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('read', false)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else if (action === 'delete' && ids && ids.length > 0) {
    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
