/**
 * API Route: Enable 2FA
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateTOTPSecret,
  generateOTPAuthUrl,
  generateQRCode,
  enable2FA,
} from '@/lib/auth/two-factor'
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

    // Get or generate secret (should be from session/temporary storage)
    // In production, store secret temporarily until verification
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Generate new secret if starting fresh
    const secret = generateTOTPSecret()

    // Enable 2FA
    const result = await enable2FA(user.id, secret, token)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    logger.info('2FA enabled via API', { userId: user.id })

    return NextResponse.json({
      success: true,
      backupCodes: result.backupCodes,
      message: '2FA enabled successfully. Save your backup codes!',
    })
  } catch (error) {
    logger.error('2FA enable API error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET: Generate QR code for 2FA setup
 */
export async function GET(request: NextRequest) {
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

    // Get user email
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Generate secret and QR code
    const secret = generateTOTPSecret()
    const otpAuthUrl = generateOTPAuthUrl(userData.email, secret)
    const qrCodeDataUrl = await generateQRCode(otpAuthUrl)

    logger.info('2FA QR code generated', { userId: user.id })

    return NextResponse.json({
      secret,
      qrCode: qrCodeDataUrl,
      otpAuthUrl,
    })
  } catch (error) {
    logger.error('2FA QR code generation error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
