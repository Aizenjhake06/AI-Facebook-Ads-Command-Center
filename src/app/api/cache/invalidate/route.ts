/**
 * API Route: Invalidate cache (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  invalidateWorkspaceCache,
  invalidateCampaignCache,
  invalidateInsightsCache,
  cacheDelPattern,
} from '@/lib/cache'
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
    const { type, workspaceId, campaignId, pattern } = body

    let deleted = 0

    switch (type) {
      case 'workspace':
        if (!workspaceId) {
          return NextResponse.json(
            { error: 'workspaceId required' },
            { status: 400 }
          )
        }
        deleted = await invalidateWorkspaceCache(workspaceId)
        break

      case 'campaign':
        if (!workspaceId) {
          return NextResponse.json(
            { error: 'workspaceId required' },
            { status: 400 }
          )
        }
        deleted = await invalidateCampaignCache(workspaceId, campaignId)
        break

      case 'insights':
        if (!workspaceId) {
          return NextResponse.json(
            { error: 'workspaceId required' },
            { status: 400 }
          )
        }
        deleted = await invalidateInsightsCache(workspaceId)
        break

      case 'pattern':
        if (!pattern) {
          return NextResponse.json(
            { error: 'pattern required' },
            { status: 400 }
          )
        }
        deleted = await cacheDelPattern(pattern)
        break

      case 'all':
        deleted = await cacheDelPattern('adpilot:*')
        break

      default:
        return NextResponse.json(
          { error: 'Invalid invalidation type' },
          { status: 400 }
        )
    }

    logger.info('Cache invalidated', { userId: user.id, type, deleted })

    return NextResponse.json({
      success: true,
      deleted,
      message: `Invalidated ${deleted} cache keys`,
    })
  } catch (error) {
    logger.error('Cache invalidation API error', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
