/**
 * Metrics Collection for Application Monitoring
 * Simple in-memory metrics that can be exposed via /api/metrics endpoint
 */

interface MetricValue {
  count: number
  sum: number
  min: number
  max: number
  lastUpdate: number
}

class Metrics {
  private counters: Map<string, number> = new Map()
  private gauges: Map<string, number> = new Map()
  private histograms: Map<string, MetricValue> = new Map()

  /**
   * Increment a counter
   */
  increment(name: string, value: number = 1, labels?: Record<string, string>) {
    const key = this.getKey(name, labels)
    const current = this.counters.get(key) || 0
    this.counters.set(key, current + value)
  }

  /**
   * Set a gauge value
   */
  gauge(name: string, value: number, labels?: Record<string, string>) {
    const key = this.getKey(name, labels)
    this.gauges.set(key, value)
  }

  /**
   * Record a histogram value (for latencies, sizes, etc.)
   */
  histogram(name: string, value: number, labels?: Record<string, string>) {
    const key = this.getKey(name, labels)
    const current = this.histograms.get(key) || {
      count: 0,
      sum: 0,
      min: value,
      max: value,
      lastUpdate: Date.now(),
    }

    this.histograms.set(key, {
      count: current.count + 1,
      sum: current.sum + value,
      min: Math.min(current.min, value),
      max: Math.max(current.max, value),
      lastUpdate: Date.now(),
    })
  }

  /**
   * Time a function execution
   */
  async time<T>(
    name: string,
    fn: () => Promise<T>,
    labels?: Record<string, string>
  ): Promise<T> {
    const start = Date.now()
    try {
      const result = await fn()
      const duration = Date.now() - start
      this.histogram(name, duration, labels)
      return result
    } catch (error) {
      const duration = Date.now() - start
      this.histogram(name, duration, { ...labels, status: 'error' })
      throw error
    }
  }

  /**
   * Get all metrics in Prometheus format
   */
  getPrometheusFormat(): string {
    const lines: string[] = []

    // Counters
    for (const [key, value] of this.counters.entries()) {
      lines.push(`# TYPE ${key} counter`)
      lines.push(`${key} ${value}`)
    }

    // Gauges
    for (const [key, value] of this.gauges.entries()) {
      lines.push(`# TYPE ${key} gauge`)
      lines.push(`${key} ${value}`)
    }

    // Histograms
    for (const [key, value] of this.histograms.entries()) {
      const avg = value.count > 0 ? value.sum / value.count : 0
      lines.push(`# TYPE ${key} histogram`)
      lines.push(`${key}_count ${value.count}`)
      lines.push(`${key}_sum ${value.sum}`)
      lines.push(`${key}_min ${value.min}`)
      lines.push(`${key}_max ${value.max}`)
      lines.push(`${key}_avg ${avg.toFixed(2)}`)
    }

    return lines.join('\n')
  }

  /**
   * Get all metrics as JSON
   */
  getJSON() {
    const histogramsJSON: Record<string, any> = {}
    for (const [key, value] of this.histograms.entries()) {
      const avg = value.count > 0 ? value.sum / value.count : 0
      histogramsJSON[key] = {
        count: value.count,
        sum: value.sum,
        min: value.min,
        max: value.max,
        avg: parseFloat(avg.toFixed(2)),
      }
    }

    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: histogramsJSON,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.counters.clear()
    this.gauges.clear()
    this.histograms.clear()
  }

  /**
   * Generate metric key with labels
   */
  private getKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name
    }

    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',')

    return `${name}{${labelStr}}`
  }
}

// Singleton instance
export const metrics = new Metrics()

// Pre-defined metric names (for consistency)
export const MetricNames = {
  // API metrics
  API_REQUEST_DURATION: 'api_request_duration_ms',
  API_REQUEST_COUNT: 'api_request_count',
  API_ERROR_COUNT: 'api_error_count',

  // Database metrics
  DB_QUERY_DURATION: 'db_query_duration_ms',
  DB_CONNECTION_COUNT: 'db_connection_count',

  // Sync metrics
  SYNC_DURATION: 'sync_duration_ms',
  SYNC_SUCCESS_COUNT: 'sync_success_count',
  SYNC_FAILURE_COUNT: 'sync_failure_count',
  SYNC_RECORDS_PROCESSED: 'sync_records_processed',

  // Alert metrics
  ALERT_GENERATED_COUNT: 'alert_generated_count',
  ALERT_SCAN_DURATION: 'alert_scan_duration_ms',

  // Report metrics
  REPORT_GENERATION_DURATION: 'report_generation_duration_ms',
  REPORT_SUCCESS_COUNT: 'report_success_count',
  REPORT_FAILURE_COUNT: 'report_failure_count',

  // Job queue metrics
  JOB_QUEUE_DEPTH: 'job_queue_depth',
  JOB_PROCESSING_DURATION: 'job_processing_duration_ms',
  JOB_FAILURE_COUNT: 'job_failure_count',

  // Business metrics
  ACTIVE_USERS: 'active_users',
  ACTIVE_WORKSPACES: 'active_workspaces',
  ACTIVE_CAMPAIGNS: 'active_campaigns',
  TOTAL_AD_SPEND: 'total_ad_spend',
}

// Helper function for API request tracking
export function trackAPIRequest(
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number
) {
  metrics.increment(MetricNames.API_REQUEST_COUNT, 1, {
    endpoint,
    method,
    status: String(statusCode),
  })

  metrics.histogram(MetricNames.API_REQUEST_DURATION, duration, {
    endpoint,
    method,
  })

  if (statusCode >= 400) {
    metrics.increment(MetricNames.API_ERROR_COUNT, 1, {
      endpoint,
      method,
      status: String(statusCode),
    })
  }
}

// Helper function for database query tracking
export function trackDBQuery(operation: string, duration: number, success: boolean) {
  metrics.histogram(MetricNames.DB_QUERY_DURATION, duration, {
    operation,
    status: success ? 'success' : 'error',
  })
}

export default metrics
