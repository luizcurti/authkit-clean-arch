import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { env } from '@/main/config/env'

const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] })
)

const consoleFormat = winston.format.combine(
  customFormat,
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, metadata, stack }) => {
    let log = `${timestamp} [${level}]: ${message}`
    
    if (metadata && Object.keys(metadata).length > 0) {
      log += `\n${JSON.stringify(metadata, null, 2)}`
    }
    
    if (stack) {
      log += `\n${stack}`
    }
    
    return log
  })
)

// File format (structured JSON)
const fileFormat = winston.format.combine(
  customFormat,
  winston.format.json()
)

const createTransports = (): winston.transport[] => {
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: consoleFormat,
      level: env.isDevelopment ? 'debug' : 'info',
      silent: env.isTest
    })
  ]

  if (env.isProduction || process.env.ENABLE_FILE_LOGS === 'true') {
    transports.push(
      new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: fileFormat,
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true
      }),
      new DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        format: fileFormat,
        maxSize: '20m',
        maxFiles: '7d',
        zippedArchive: true
      })
    )
  }

  return transports
}

export const logger = winston.createLogger({
  level: env.isDevelopment ? 'debug' : 'info',
  format: customFormat,
  transports: createTransports(),
  exitOnError: false
})

export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim())
  }
}

export const log = {
  error: (message: string, meta?: Record<string, unknown>) => logger.error(message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, meta),
  info: (message: string, meta?: Record<string, unknown>) => logger.info(message, meta),
  http: (message: string, meta?: Record<string, unknown>) => logger.http(message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, meta)
}
