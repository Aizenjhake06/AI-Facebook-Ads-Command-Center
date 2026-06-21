/**
 * Job Queue Configuration
 * Using Bull for background job processing
 */

import Queue from 'bull'

// Redis connection configuration
const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    // For Upstash Redis
    ...(process.env.UPSTASH_REDIS_REST_URL && {
      host: new URL(process.env.UPSTASH_REDIS_REST_URL).hostname,
      port: parseInt(new URL(process.env.UPSTASH_REDIS_REST_URL).port || '6379'),
      password: process.env.UPSTASH_REDIS_REST_TOKEN,
      tls: {},
    }),
  },
}

// Queue definitions with default options
const queueOptions = {
  ...redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2 seconds initial delay
    },
    removeOnComplete: 1000, // Keep last 1000 completed jobs
    removeOnFail: 5000, // Keep last 5000 failed jobs for debugging
  },
}

/**
 * Data Sync Queue
 * Handles Meta API sync operations
 */
export const syncQueue = new Queue('sync', queueOptions)

/**
 * Alert Evaluation Queue
 * Scans campaigns for performance anomalies
 */
export const alertQueue = new Queue('alerts', queueOptions)

/**
 * Report Generation Queue
 * Handles async report generation (CSV, Excel, PDF)
 */
export const reportQueue = new Queue('reports', queueOptions)

/**
 * Forecast Generation Queue
 * Regenerates forecasts for campaigns
 */
export const forecastQueue = new Queue('forecasts', queueOptions)

/**
 * Recommendation Generation Queue
 * Generates AI-powered optimization recommendations
 */
export const recommendationQueue = new Queue('recommendations', queueOptions)

/**
 * Notification Queue
 * Handles email and push notifications
 */
export const notificationQueue = new Queue('notifications', queueOptions)

// Export all queues for centralized management
export const allQueues = [
  syncQueue,
  alertQueue,
  reportQueue,
  forecastQueue,
  recommendationQueue,
  notificationQueue,
]

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing queues...')
  await Promise.all(allQueues.map(queue => queue.close()))
  process.exit(0)
})
