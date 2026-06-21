import {
  validateWorkspaceId,
  sanitizeString,
  uuidSchema,
  dateRangeSchema,
  paginationSchema,
  createReportSchema,
} from '../validation'

describe('validation', () => {
  describe('validateWorkspaceId', () => {
    it('accepts valid UUID', () => {
      expect(validateWorkspaceId('550e8400-e29b-41d4-a716-446655440000')).toBeNull()
    })
    it('rejects invalid UUID', () => {
      expect(validateWorkspaceId('not-a-uuid')).toBe('Invalid workspace_id format')
    })
    it('rejects number passed as any', () => {
      expect(validateWorkspaceId(123 as unknown as string)).toBe('Invalid workspace_id format')
    })
  })

  describe('sanitizeString', () => {
    it('trims whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello')
    })
    it('removes XSS characters', () => {
      expect(sanitizeString('<script>alert(1)</script>')).toBe('scriptalert(1)/script')
    })
    it('removes control characters', () => {
      expect(sanitizeString('hello\x00world')).toBe('helloworld')
    })
  })

  describe('uuidSchema', () => {
    it('accepts valid UUID', () => {
      const result = uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000')
      expect(result.success).toBe(true)
    })
    it('rejects invalid UUID', () => {
      const result = uuidSchema.safeParse('not-a-uuid')
      expect(result.success).toBe(false)
    })
  })

  describe('dateRangeSchema', () => {
    it('accepts valid date range', () => {
      const result = dateRangeSchema.safeParse({
        start_date: '2026-01-01',
        end_date: '2026-06-21'
      })
      expect(result.success).toBe(true)
    })
    it('accepts partial date range', () => {
      const result = dateRangeSchema.safeParse({ start_date: '2026-01-01' })
      expect(result.success).toBe(true)
    })
    it('rejects invalid date format', () => {
      const result = dateRangeSchema.safeParse({ start_date: 'invalid' })
      expect(result.success).toBe(false)
    })
  })

  describe('paginationSchema', () => {
    it('returns defaults for empty input', () => {
      const result = paginationSchema.parse({})
      expect(result).toEqual({ page: 1, limit: 25 })
    })
    it('rejects limit exceeding max', () => {
      const result = paginationSchema.safeParse({ limit: 500 })
      expect(result.success).toBe(false)
    })
    it('accepts valid pagination', () => {
      const result = paginationSchema.parse({ page: 2, limit: 50 })
      expect(result).toEqual({ page: 2, limit: 50 })
    })
  })

  describe('createReportSchema', () => {
    it('accepts valid report params', () => {
      const result = createReportSchema.safeParse({
        workspace_id: '550e8400-e29b-41d4-a716-446655440000',
        report_type: 'campaign_summary',
        format: 'csv',
        title: 'Test Report'
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid report type', () => {
      const result = createReportSchema.safeParse({
        workspace_id: '550e8400-e29b-41d4-a716-446655440000',
        report_type: 'invalid',
        format: 'csv',
        title: 'Test Report'
      })
      expect(result.success).toBe(false)
    })
    it('rejects invalid format', () => {
      const result = createReportSchema.safeParse({
        workspace_id: '550e8400-e29b-41d4-a716-446655440000',
        report_type: 'campaign_summary',
        format: 'xml',
        title: 'Test Report'
      })
      expect(result.success).toBe(false)
    })
  })
})
