import { createConsola } from 'consola'

/**
 * Centralized logger using consola
 *
 * Features:
 * - Automatic dev/prod mode (only logs in development)
 * - Colored, formatted output with icons
 * - Consistent logging across renderer & main process
 * - Type-safe log levels
 *
 * Usage:
 * ```ts
 * import { logger } from '@/shared/logger'
 *
 * logger.debug('Loading objects:', objects)
 * logger.info('File opened successfully')
 * logger.warn('Missing viewport data, using defaults')
 * logger.error('Failed to save object:', error)
 * logger.success('Objects loaded:', count)
 * ```
 */

// Create base logger instance
const baseLogger = createConsola({
  level: import.meta.env.DEV ? 5 : 3, // Verbose in dev, warn+ in production
  formatOptions: {
    colors: true,
    compact: false,
    date: false,
  },
})

// Export tagged loggers for different parts of the app
export const logger = {
  // Generic logger (use sparingly)
  log: baseLogger.log.bind(baseLogger),

  // Preferred methods with semantic meaning
  debug: baseLogger.debug.bind(baseLogger),
  info: baseLogger.info.bind(baseLogger),
  success: baseLogger.success.bind(baseLogger),
  warn: baseLogger.warn.bind(baseLogger),
  error: baseLogger.error.bind(baseLogger),
  fatal: baseLogger.fatal.bind(baseLogger),

  // Namespaced loggers for specific modules
  canvas: baseLogger.withTag('canvas'),
  viewport: baseLogger.withTag('viewport'),
  objects: baseLogger.withTag('objects'),
  ipc: baseLogger.withTag('ipc'),
  file: baseLogger.withTag('file'),
  tabs: baseLogger.withTag('tabs'),
  widgets: baseLogger.withTag('widgets'),

  // Create custom tagged logger
  withTag: (tag: string) => baseLogger.withTag(tag),

  // Box for important messages
  box: baseLogger.box.bind(baseLogger),

  // Start/ready for lifecycle events
  start: baseLogger.start.bind(baseLogger),
  ready: baseLogger.ready.bind(baseLogger),
}

// Export types for use in other files
export type Logger = typeof logger
export type TaggedLogger = ReturnType<typeof logger.withTag>
