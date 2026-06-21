/**
 * API Route: Verify 2FA token during login
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verify2FA } from '@/lib/auth/two-factor'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    // Verify 2FA token
    const result = await verify2FA(user.id, token)

    if (!result.success) {
      logger.warn('2FA verification failed', { userId: user.id })
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    logger.info('2FA verified successfully', { userId: user.id })

    return NextResponse.json({
      success: true,
      message: '2FA verification successful',
    })
  } catch (error) {
    logger.error('2FA verification API error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
