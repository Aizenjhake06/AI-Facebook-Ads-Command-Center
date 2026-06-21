/**
 * API Middleware Utilities
 * Wraps API handlers with common functionality:
 * - Error handling
 * - Metrics tracking
 * - Logging
 * - Request validation
 */

import { NextRequest, NextResponse } from 'next/server'
import { formatErrorResponse, AppError } from './error-handler'
import { trackAPIRequest } from './metrics'
import { logger } from './logger'

type APIHandler = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse> | NextResponse

interface MiddlewareOptions {
  requireAuth?: boolean
  trackMetrics?: boolean
  logRequests?: boolean
}

/**
 * Wrap API handler with middleware
 */
export function withMiddleware(
  handler: APIHandler,
  options: MiddlewareOptions = {}
) {
  const {
    requireAuth = false,
    trackMetrics = true,
    logRequests = true,
  } = options

  return async (request: NextRequest, context?: any) => {
    const startTime = Date.now()
    const method = request.method
    const pathname = new URL(request.url).pathname

    try {
      // Log incoming request
      if (logRequests) {
        logger.info('API request received', {
          method,
          pathname,
          userAgent: request.headers.get('user-agent'),
        })
      }

      // TODO: Add auth check if required
      if (requireAuth) {
        // Implement auth validation here
      }

      // Execute handler
      const response = await handler(request, context)

      // Track metrics
      if (trackMetrics) {
        const duration = Date.now() - startTime
        trackAPIRequest(pathname, method, response.status, duration)
      }

      // Log response
      if (logRequests) {
        logger.info('API request completed', {
          method,
          pathname,
          status: response.status,
          duration: Date.now() - startTime,
        })
      }

      return response
    } catch (error) {
      // Log error
      logger.error('API request failed', error, {
        method,
        pathname,
        duration: Date.now() - startTime,
      })

      // Format error response
      const { error: errorData, statusCode } = formatErrorResponse(error)

      // Track error metrics
      if (trackMetrics) {
        const duration = Date.now() - startTime
        trackAPIRequest(pathname, method, statusCode, duration)
      }

      return NextResponse.json(errorData, { status: statusCode })
    }
  }
}

/**
 * Validate request body against schema
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: any // Use Zod schema
): Promise<T> {
  try {
    const body = await request.json()
    return schema.parse(body)
  } catch (error) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Invalid request body',
      400,
      error
    )
  }
}

/**
 * Validate query parameters
 */
export function validateQueryParams(
  request: NextRequest,
  required: string[]
): Record<string, string> {
  const { searchParams } = new URL(request.url)
  const params: Record<string, string> = {}

  for (const param of required) {
    const value = searchParams.get(param)
    if (!value) {
      throw new AppError(
        'MISSING_PARAMETER',
        `Missing required parameter: ${param}`,
        400
      )
    }
    params[param] = value
  }

  return params
}

/**
 * Parse pagination parameters
 */
export function parsePagination(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const limit = Math.min(
    parseInt(searchParams.get('limit') || '50'),
    100 // Max limit
  )
  
  const offset = parseInt(searchParams.get('offset') || '0')

  return { limit, offset }
}

/**
 * Create paginated response
 */
export function createPaginatedResponse(
  data: any[],
  total: number,
  limit: number,
  offset: number
) {
  return NextResponse.json({
    data,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  })
}

/**
 * Rate limit check helper
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60000
): Promise<boolean> {
  // TODO: Implement actual rate limiting with Redis
  // For now, always allow
  return true
}
