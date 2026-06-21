/**
 * Error Handler Tests
 */

import { describe, it, expect } from '@jest/globals'
import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  retryWithBackoff,
  formatErrorResponse,
} from '../error-handler'

describe('Error Classes', () => {
  it('should create AppError with correct properties', () => {
    const error = new AppError('TEST_CODE', 'Test message', 400, { field: 'test' })
    expect(error.code).toBe('TEST_CODE')
    expect(error.message).toBe('Test message')
    expect(error.statusCode).toBe(400)
    expect(error.details).toEqual({ field: 'test' })
  })

  it('should create AuthenticationError with 401 status', () => {
    const error = new AuthenticationError()
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe('AUTH_REQUIRED')
  })

  it('should create AuthorizationError with 403 status', () => {
    const error = new AuthorizationError()
    expect(error.statusCode).toBe(403)
    expect(error.code).toBe('FORBIDDEN')
  })

  it('should create ValidationError with details', () => {
    const error = new ValidationError('Invalid input', { field: 'email' })
    expect(error.statusCode).toBe(400)
    expect(error.details).toEqual({ field: 'email' })
  })

  it('should create NotFoundError with resource name', () => {
    const error = new NotFoundError('Campaign')
    expect(error.message).toContain('Campaign')
    expect(error.statusCode).toBe(404)
  })

  it('should create RateLimitError with retry info', () => {
    const error = new RateLimitError(60)
    expect(error.statusCode).toBe(429)
    expect(error.details.retryAfter).toBe(60)
  })
})

describe('retryWithBackoff', () => {
  it('should succeed on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success')
    const result = await retryWithBackoff(fn)
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry on failure and eventually succeed', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('Attempt 1'))
      .mockRejectedValueOnce(new Error('Attempt 2'))
      .mockResolvedValue('success')

    const result = await retryWithBackoff(fn, { maxAttempts: 3, initialDelay: 10 })
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should throw after max attempts', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Always fails'))
    
    await expect(
      retryWithBackoff(fn, { maxAttempts: 2, initialDelay: 10 })
    ).rejects.toThrow('Always fails')
    
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should call onRetry callback', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValue('success')
    
    const onRetry = jest.fn()

    await retryWithBackoff(fn, { maxAttempts: 3, initialDelay: 10, onRetry })
    
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
  })
})

describe('formatErrorResponse', () => {
  it('should format AppError correctly', () => {
    const error = new ValidationError('Invalid email', { field: 'email' })
    const response = formatErrorResponse(error)
    
    expect(response.statusCode).toBe(400)
    expect(response.error.code).toBe('VALIDATION_ERROR')
    expect(response.error.message).toBe('Invalid email')
    expect(response.error.details).toEqual({ field: 'email' })
    expect(response.error.timestamp).toBeDefined()
  })

  it('should format unknown error safely', () => {
    const error = new Error('Some random error')
    const response = formatErrorResponse(error)
    
    expect(response.statusCode).toBe(500)
    expect(response.error.code).toBe('INTERNAL_ERROR')
    expect(response.error.message).toBe('An unexpected error occurred')
    expect(response.error.timestamp).toBeDefined()
  })

  it('should handle non-Error objects', () => {
    const response = formatErrorResponse('string error')
    
    expect(response.statusCode).toBe(500)
    expect(response.error.code).toBe('INTERNAL_ERROR')
  })
})
