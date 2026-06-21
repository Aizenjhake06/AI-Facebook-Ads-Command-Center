/**
 * Redis Cache Helper Functions
 */

import Redis from 'ioredis'
import { logger } from './logger'

// Create Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  maxRetriesPerRequest: 3,
})

redis.on('error', (err) => {
  logger.error('Redis connection error', err)
})

redis.on('connect', () => {
  logger.info('Redis connected successfully')
})

/**
 * Cache key prefixes
 */
export const CacheKeys = {
  CAMPAIGNS: 'campaigns',
  AD_SETS: 'adsets',
  ADS: 'ads',
  INSIGHTS: 'insights',
  HEALTH_SCORE: 'health',
  RECOMMENDATIONS: 'recommendations',
  FORECASTS: 'forecasts',
  ALERTS: 'alerts',
  USER_PROFILE: 'user',
  WORKSPACE: 'workspace',
} as const

/**
 * Default TTL values (in seconds)
 */
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 900, // 15 minutes
  HOUR: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const

/**
 * Generate cache key
 */
export function cacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `adpilot:${prefix}:${parts.join(':')}`
}

/**
 * Get value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key)
    if (!value) {
      return null
    }
    return JSON.parse(value) as T
  } catch (error) {
    logger.error('Cache get error', error, { key })
    return null
  }
}

/**
 * Set value in cache with TTL
 */
export async function cacheSet(
  key: string,
  value: any,
  ttl: number = CacheTTL.MEDIUM
): Promise<boolean> {
  try {
    const serialized = JSON.stringify(value)
    await redis.setex(key, ttl, serialized)
    return true
  } catch (error) {
    logger.error('Cache set error', error, { key, ttl })
    return false
  }
}

/**
 * Delete value from cache
 */
export async function cacheDel(key: string): Promise<boolean> {
  try {
    await redis.del(key)
    return true
  } catch (error) {
    logger.error('Cache delete error', error, { key })
    return false
  }
}

/**
 * Delete multiple keys matching pattern
 */
export async function cacheDelPattern(pattern: string): Promise<number> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length === 0) {
      return 0
    }
    await redis.del(...keys)
    return keys.length
  } catch (error) {
    logger.error('Cache delete pattern error', error, { pattern })
    return 0
  }
}

/**
 * Check if key exists in cache
 */
export async function cacheExists(key: string): Promise<boolean> {
  try {
    const exists = await redis.exists(key)
    return exists === 1
  } catch (error) {
    logger.error('Cache exists error', error, { key })
    return false
  }
}

/**
 * Get or set value in cache (fetch if not cached)
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = CacheTTL.MEDIUM
): Promise<T> {
  // Try to get from cache
  const cached = await cacheGet<T>(key)
  if (cached !== null) {
    logger.debug('Cache hit', { key })
    return cached
  }

  // Cache miss - fetch data
  logger.debug('Cache miss', { key })
  const value = await fetchFn()

  // Store in cache (don't await)
  cacheSet(key, value, ttl).catch((err) => {
    logger.error('Background cache set error', err, { key })
  })

  return value
}

/**
 * Increment counter in cache
 */
export async function cacheIncr(key: string, amount: number = 1): Promise<number> {
  try {
    const value = await redis.incrby(key, amount)
    return value
  } catch (error) {
    logger.error('Cache increment error', error, { key, amount })
    return 0
  }
}

/**
 * Set expiration on existing key
 */
export async function cacheExpire(key: string, ttl: number): Promise<boolean> {
  try {
    await redis.expire(key, ttl)
    return true
  } catch (error) {
    logger.error('Cache expire error', error, { key, ttl })
    return false
  }
}

/**
 * Get multiple keys at once
 */
export async function cacheMGet<T>(keys: string[]): Promise<(T | null)[]> {
  try {
    if (keys.length === 0) {
      return []
    }
    const values = await redis.mget(...keys)
    return values.map((v) => (v ? JSON.parse(v) : null))
  } catch (error) {
    logger.error('Cache mget error', error, { keys })
    return keys.map(() => null)
  }
}

/**
 * Set multiple key-value pairs at once
 */
export async function cacheMSet(
  entries: Array<{ key: string; value: any; ttl?: number }>
): Promise<boolean> {
  try {
    const pipeline = redis.pipeline()
    
    entries.forEach(({ key, value, ttl }) => {
      const serialized = JSON.stringify(value)
      if (ttl) {
        pipeline.setex(key, ttl, serialized)
      } else {
        pipeline.set(key, serialized)
      }
    })

    await pipeline.exec()
    return true
  } catch (error) {
    logger.error('Cache mset error', error)
    return false
  }
}

/**
 * Invalidate cache for workspace
 */
export async function invalidateWorkspaceCache(workspaceId: string): Promise<number> {
  const pattern = cacheKey('*', workspaceId, '*')
  const deleted = await cacheDelPattern(pattern)
  logger.info('Workspace cache invalidated', { workspaceId, deleted })
  return deleted
}

/**
 * Invalidate cache for campaigns
 */
export async function invalidateCampaignCache(
  workspaceId: string,
  campaignId?: string
): Promise<number> {
  const pattern = campaignId
    ? cacheKey(CacheKeys.CAMPAIGNS, workspaceId, campaignId, '*')
    : cacheKey(CacheKeys.CAMPAIGNS, workspaceId, '*')
  
  const deleted = await cacheDelPattern(pattern)
  logger.info('Campaign cache invalidated', { workspaceId, campaignId, deleted })
  return deleted
}

/**
 * Invalidate insights cache for date range
 */
export async function invalidateInsightsCache(
  workspaceId: string,
  startDate?: string
): Promise<number> {
  const pattern = startDate
    ? cacheKey(CacheKeys.INSIGHTS, workspaceId, startDate, '*')
    : cacheKey(CacheKeys.INSIGHTS, workspaceId, '*')
  
  const deleted = await cacheDelPattern(pattern)
  logger.info('Insights cache invalidated', { workspaceId, deleted })
  return deleted
}

/**
 * Health check for Redis
 */
export async function cacheHealthCheck(): Promise<boolean> {
  try {
    await redis.ping()
    return true
  } catch (error) {
    logger.error('Redis health check failed', error)
    return false
  }
}

export default redis
