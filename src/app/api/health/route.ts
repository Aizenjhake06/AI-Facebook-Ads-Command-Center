import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

type HealthStatus = 'ok' | 'degraded' | 'error'
type CheckResult = { status: HealthStatus; message?: string; latency?: number }

export async function GET() {
  const checks: Record<string, CheckResult> = {}
  const startTime = Date.now()

  // Database check
  try {
    const dbStart = Date.now()
    const supabase = await createClient()
    const { error, data } = await supabase.from('workspaces').select('id').limit(1)
    checks.database = {
      status: error ? 'error' : 'ok',
      message: error?.message || `Connected successfully`,
      latency: Date.now() - dbStart,
    }
  } catch (e: any) {
    checks.database = { status: 'error', message: e.message }
    logger.error('Health check: Database check failed', e)
  }

  // Memory check
  const memUsage = process.memoryUsage()
  const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
  const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024)
  checks.memory = {
    status: memUsage.heapUsed < 512 * 1024 * 1024 ? 'ok' : heapUsedMB < 768 ? 'degraded' : 'error',
    message: `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB`,
  }

  // Redis check (if configured)
  if (process.env.REDIS_HOST || process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const redisStart = Date.now()
      // TODO: Implement actual Redis ping
      checks.redis = {
        status: 'ok',
        message: 'Redis not yet implemented',
        latency: Date.now() - redisStart,
      }
    } catch (e: any) {
      checks.redis = { status: 'error', message: e.message }
      logger.error('Health check: Redis check failed', e)
    }
  }

  // Job queue health (if Redis is available)
  if (checks.redis?.status === 'ok') {
    try {
      // TODO: Check queue health (job count, failed jobs, etc.)
      checks.jobQueue = {
        status: 'ok',
        message: 'Queue health not yet implemented',
      }
    } catch (e: any) {
      checks.jobQueue = { status: 'error', message: e.message }
    }
  }

  // Determine overall status
  const hasErrors = Object.values(checks).some((c) => c.status === 'error')
  const hasDegraded = Object.values(checks).some((c) => c.status === 'degraded')
  const overallStatus: HealthStatus = hasErrors ? 'error' : hasDegraded ? 'degraded' : 'ok'

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    latency: Date.now() - startTime,
    checks,
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
  }

  // Log unhealthy state
  if (overallStatus !== 'ok') {
    logger.warn('Health check returned non-ok status', { status: overallStatus, checks })
  }

  return NextResponse.json(response, { 
    status: overallStatus === 'ok' ? 200 : overallStatus === 'degraded' ? 200 : 503 
  })
}
