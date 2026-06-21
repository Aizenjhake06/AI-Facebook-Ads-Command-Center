/**
 * Metrics Endpoint - Exposes application metrics for monitoring
 * Can be scraped by Prometheus or viewed directly
 */

import { NextResponse } from 'next/server'
import { metrics } from '@/lib/metrics'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'json'

  // Optional: Add basic authentication for production
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.METRICS_AUTH_TOKEN

  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    if (format === 'prometheus') {
      // Return Prometheus format
      const prometheusText = metrics.getPrometheusFormat()
      return new Response(prometheusText, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      })
    } else {
      // Return JSON format
      const metricsData = metrics.getJSON()
      return NextResponse.json(metricsData)
    }
  } catch (error) {
    console.error('Metrics endpoint error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    )
  }
}

// Optional: Reset metrics (useful for testing)
export async function DELETE(request: Request) {
  const authHeader = request.headers.get('authorization')
  const expectedToken = process.env.METRICS_AUTH_TOKEN

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  metrics.reset()
  return NextResponse.json({ message: 'Metrics reset successfully' })
}
