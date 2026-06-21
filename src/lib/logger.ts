/**
 * Structured Logging Utility
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

class Logger {
  private minLevel: LogLevel

  constructor() {
    const level = process.env.LOG_LEVEL?.toLowerCase() || 'info'
    this.minLevel = this.parseLevel(level)
  }

  private parseLevel(level: string): LogLevel {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.includes(level as LogLevel) ? (level as LogLevel) : 'info'
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.minLevel)
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.shouldLog(level)) return

    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...context,
    }

    const output = JSON.stringify(logEntry)

    switch (level) {
      case 'debug':
        console.debug(output)
        break
      case 'info':
        console.log(output)
        break
      case 'warn':
        console.warn(output)
        break
      case 'error':
        console.error(output)
        break
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context)
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    this.log('error', message, {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    })
  }
}

export const logger = new Logger()

// Export for easy mocking in tests
export default logger
