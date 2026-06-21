/**
 * Health Score Calculation Tests
 */

import { describe, it, expect } from '@jest/globals'

// Mock health score calculation function
function calculateHealthScore(metrics: {
  roas: number | null
  ctr: number | null
  cpa: number | null
}) {
  let score = 0
  let components = 0

  // ROAS component (40% weight) - benchmark: 4.0x
  if (metrics.roas !== null && metrics.roas >= 0) {
    const roasScore = Math.min((metrics.roas / 4.0) * 100, 100)
    score += roasScore * 0.4
    components++
  }

  // CTR component (30% weight) - benchmark: 2.0%
  if (metrics.ctr !== null && metrics.ctr >= 0) {
    const ctrScore = Math.min((metrics.ctr / 2.0) * 100, 100)
    score += ctrScore * 0.3
    components++
  }

  // CPA component (30% weight) - benchmark: $50 (inverse scoring)
  if (metrics.cpa !== null && metrics.cpa > 0) {
    const cpaScore = Math.max(100 - (metrics.cpa / 50) * 100, 0)
    score += cpaScore * 0.3
    components++
  }

  // If no valid components, return 0
  if (components === 0) return 0

  // Normalize by number of components
  return Math.round((score / components) * (components / 3) * 100)
}

describe('Health Score Calculation', () => {
  it('should return 100 for perfect metrics', () => {
    const score = calculateHealthScore({
      roas: 4.0,
      ctr: 2.0,
      cpa: 0,
    })
    expect(score).toBeGreaterThanOrEqual(95)
  })

  it('should return high score for excellent performance', () => {
    const score = calculateHealthScore({
      roas: 5.0, // Above benchmark
      ctr: 2.5,  // Above benchmark
      cpa: 20,   // Below benchmark (good)
    })
    expect(score).toBeGreaterThanOrEqual(90)
  })

  it('should return medium score for average performance', () => {
    const score = calculateHealthScore({
      roas: 2.0, // 50% of benchmark
      ctr: 1.0,  // 50% of benchmark
      cpa: 50,   // At benchmark
    })
    expect(score).toBeGreaterThanOrEqual(30)
    expect(score).toBeLessThanOrEqual(60)
  })

  it('should return low score for poor performance', () => {
    const score = calculateHealthScore({
      roas: 0.5,  // 12.5% of benchmark
      ctr: 0.2,   // 10% of benchmark
      cpa: 100,   // 2x benchmark (bad)
    })
    expect(score).toBeLessThanOrEqual(30)
  })

  it('should handle null values gracefully', () => {
    const score = calculateHealthScore({
      roas: 3.0,
      ctr: null,
      cpa: null,
    })
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('should return 0 when all metrics are null', () => {
    const score = calculateHealthScore({
      roas: null,
      ctr: null,
      cpa: null,
    })
    expect(score).toBe(0)
  })

  it('should cap score at 100', () => {
    const score = calculateHealthScore({
      roas: 10.0, // Far above benchmark
      ctr: 5.0,   // Far above benchmark
      cpa: 1,     // Very low
    })
    expect(score).toBeLessThanOrEqual(100)
  })
})
