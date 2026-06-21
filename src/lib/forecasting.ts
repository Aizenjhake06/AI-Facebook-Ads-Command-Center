export type ForecastType = 'revenue' | 'spend' | 'roas' | 'cpa' | 'purchases'

export interface ForecastPoint {
  day: number
  date: string
  predicted: number
  confidenceLower: number
  confidenceUpper: number
}

export interface CampaignForecast {
  campaignId: string
  campaignName: string
  forecastType: ForecastType
  periodDays: number
  predictedTotal: number
  confidenceLower: number
  confidenceUpper: number
  confidenceLevel: number
  historicalDataPoints: number
  modelVersion: string
  dailyForecasts: ForecastPoint[]
  trend: 'up' | 'down' | 'stable'
  trendPercent: number
}

interface TimeSeriesPoint {
  date: string
  spend: number
  revenue: number
  purchase_value: number
  clicks: number
  impressions: number
  conversions: number
  roas: number
  cpa: number
}

/**
 * Simple linear regression for trend prediction
 */
function linearRegression(values: number[]): { slope: number; intercept: number; r2: number } {
  const n = values.length
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, r2: 0 }

  const xMean = (n - 1) / 2
  const yMean = values.reduce((a, b) => a + b, 0) / n

  let numerator = 0
  let denominator = 0
  let ssTotal = 0

  for (let i = 0; i < n; i++) {
    const xDiff = i - xMean
    const yDiff = values[i] - yMean
    numerator += xDiff * yDiff
    denominator += xDiff * xDiff
    ssTotal += yDiff * yDiff
  }

  const slope = denominator > 0 ? numerator / denominator : 0
  const intercept = yMean - slope * xMean

  // Calculate R-squared
  let ssResidual = 0
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept
    ssResidual += Math.pow(values[i] - predicted, 2)
  }
  const r2 = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0

  return { slope, intercept, r2 }
}

/**
 * Calculate standard deviation for confidence intervals
 */
function calculateStdDev(values: number[]): number {
  const n = values.length
  if (n < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / n
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n
  return Math.sqrt(variance)
}

/**
 * Exponential smoothing for time series
 */
function exponentialSmooth(values: number[], alpha: number = 0.3): number[] {
  if (values.length === 0) return []
  const smoothed: number[] = [values[0]]
  for (let i = 1; i < values.length; i++) {
    smoothed.push(alpha * values[i] + (1 - alpha) * smoothed[i - 1])
  }
  return smoothed
}

function getValueForType(point: TimeSeriesPoint, type: ForecastType): number {
  switch (type) {
    case 'revenue':
      return point.purchase_value || point.revenue || 0
    case 'spend':
      return point.spend || 0
    case 'roas':
      return point.spend > 0 ? (point.purchase_value || point.revenue || 0) / point.spend : 0
    case 'cpa':
      return point.conversions > 0 ? point.spend / point.conversions : 0
    case 'purchases':
      return point.conversions || 0
    default:
      return 0
  }
}

function getForecastLabel(type: ForecastType): string {
  const labels: Record<ForecastType, string> = {
    revenue: 'Revenue',
    spend: 'Spend',
    roas: 'ROAS',
    cpa: 'CPA',
    purchases: 'Purchases',
  }
  return labels[type]
}

function formatForecastValue(value: number, type: ForecastType): string {
  switch (type) {
    case 'revenue':
    case 'spend':
    case 'cpa':
      return `$${value.toFixed(2)}`
    case 'roas':
      return `${value.toFixed(2)}x`
    case 'purchases':
      return Math.round(value).toString()
    default:
      return value.toFixed(2)
  }
}

export function generateForecasts(
  campaignId: string,
  campaignName: string,
  timeSeries: TimeSeriesPoint[],
  periodDays: number = 14,
  confidenceLevel: number = 0.95
): CampaignForecast[] {
  if (!timeSeries || timeSeries.length < 7) {
    return []
  }

  // Sort by date
  const sorted = [...timeSeries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const forecasts: CampaignForecast[] = []

  for (const type of ['revenue', 'spend', 'roas', 'cpa', 'purchases'] as ForecastType[]) {
    const values = sorted.map((p) => getValueForType(p, type))

    // Apply exponential smoothing
    const smoothed = exponentialSmooth(values, 0.3)

    // Linear regression on smoothed values
    const regression = linearRegression(smoothed)

    // Calculate standard deviation for confidence intervals
    const stdDev = calculateStdDev(values)
    const zScore = confidenceLevel >= 0.99 ? 2.576 : confidenceLevel >= 0.95 ? 1.96 : 1.645
    const marginOfError = zScore * stdDev

    // Generate daily forecasts
    const dailyForecasts: ForecastPoint[] = []
    let predictedTotal = 0

    const lastDate = new Date(sorted[sorted.length - 1].date)
    const lastIndex = smoothed.length - 1

    for (let day = 1; day <= periodDays; day++) {
      const forecastIndex = lastIndex + day
      let predicted = regression.slope * forecastIndex + regression.intercept

      // Ensure non-negative for most metrics
      if (type !== 'roas') {
        predicted = Math.max(0, predicted)
      }

      const confidenceLower = Math.max(0, predicted - marginOfError)
      const confidenceUpper = predicted + marginOfError

      const forecastDate = new Date(lastDate)
      forecastDate.setDate(forecastDate.getDate() + day)

      dailyForecasts.push({
        day,
        date: forecastDate.toISOString().split('T')[0],
        predicted,
        confidenceLower,
        confidenceUpper,
      })

      predictedTotal += predicted
    }

    // Calculate trend
    const recentAvg = values.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, values.length)
    const olderAvg = values.slice(-14, -7).reduce((a, b) => a + b, 0) / Math.min(7, values.length - 7)
    const trendPercent = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0
    const trend: 'up' | 'down' | 'stable' =
      Math.abs(trendPercent) < 5 ? 'stable' : trendPercent > 0 ? 'up' : 'down'

    forecasts.push({
      campaignId,
      campaignName,
      forecastType: type,
      periodDays,
      predictedTotal,
      confidenceLower: Math.max(0, predictedTotal - marginOfError * periodDays),
      confidenceUpper: predictedTotal + marginOfError * periodDays,
      confidenceLevel,
      historicalDataPoints: sorted.length,
      modelVersion: 'v1.0-linear',
      dailyForecasts,
      trend,
      trendPercent: Math.round(trendPercent * 10) / 10,
    })
  }

  return forecasts
}

export function generateWorkspaceForecasts(
  timeSeries: TimeSeriesPoint[],
  periodDays: number = 14
): CampaignForecast[] {
  // Aggregate all time series into workspace-level
  const aggregated: Record<string, TimeSeriesPoint> = {}

  for (const point of timeSeries) {
    if (!aggregated[point.date]) {
      aggregated[point.date] = {
        date: point.date,
        spend: 0,
        revenue: 0,
        purchase_value: 0,
        clicks: 0,
        impressions: 0,
        conversions: 0,
        roas: 0,
        cpa: 0,
      }
    }
    const agg = aggregated[point.date]
    agg.spend += point.spend || 0
    agg.revenue += point.revenue || 0
    agg.purchase_value += point.purchase_value || 0
    agg.clicks += point.clicks || 0
    agg.impressions += point.impressions || 0
    agg.conversions += point.conversions || 0
  }

  // Recalculate derived metrics for aggregated data
  const sorted = Object.values(aggregated).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  for (const point of sorted) {
    point.roas = point.spend > 0 ? (point.purchase_value || point.revenue || 0) / point.spend : 0
    point.cpa = point.conversions > 0 ? point.spend / point.conversions : 0
  }

  return generateForecasts('workspace', 'All Campaigns', sorted, periodDays)
}

export { formatForecastValue, getForecastLabel }
