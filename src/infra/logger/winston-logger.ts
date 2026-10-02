import winston from 'winston'
import { env } from '@/main/config/env'

const customFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] })
)

export const formatConsoleLine = ({ timestamp, level, message, metadata, stack }: winston.Logform.TransformableInfo): string => {
  let log = `${timestamp} [${level}]: ${message}`

  if (metadata && Object.keys(metadata).length > 0) {
    log += `\n${JSON.stringify(metadata, null, 2)}`
  }

  if (stack) {
    log += `\n${stack}`
  }

  return log
}

// Runs after the logger-level format; applying that again would nest the metadata
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.printf(formatConsoleLine)
)

// One JSON object per line, for log collectors
const jsonFormat = winston.format.json()

const level = process.env.LOG_LEVEL ?? (env.isDevelopment ? 'debug' : 'info')

const createTransports = (): winston.transport[] => [
  new winston.transports.Console({
    format: env.isProduction ? jsonFormat : consoleFormat,
    level,
    silent: env.isTest
  })
]

const logger = winston.createLogger({
  level,
  format: customFormat,
  transports: createTransports(),
  exitOnError: false
})

export const log = {
  error: (message: string, meta?: Record<string, unknown>) => logger.error(message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, meta),
  info: (message: string, meta?: Record<string, unknown>) => logger.info(message, meta),
  http: (message: string, meta?: Record<string, unknown>) => logger.http(message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, meta)
}
