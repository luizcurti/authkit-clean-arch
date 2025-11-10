import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { env } from '@/main/config/env'

// Formatos personalizados
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] })
)

// Formato para console (colorido e legível)
const consoleFormat = winston.format.combine(
  customFormat,
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, metadata, stack }) => {
    let log = `${timestamp} [${level}]: ${message}`
    
    // Adiciona metadata se existir
    if (metadata && Object.keys(metadata).length > 0) {
      log += `\n${JSON.stringify(metadata, null, 2)}`
    }
    
    // Adiciona stack trace se for erro
    if (stack) {
      log += `\n${stack}`
    }
    
    return log
  })
)

// Formato para arquivo (JSON estruturado)
const fileFormat = winston.format.combine(
  customFormat,
  winston.format.json()
)

// Transports
const transports: winston.transport[] = []

// Console transport (sempre ativo)
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
    level: env.isDevelopment ? 'debug' : 'info'
  })
)

// File transports (apenas em produção ou se especificado)
if (env.isProduction || process.env.ENABLE_FILE_LOGS === 'true') {
  // Erros em arquivo separado
  transports.push(
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: fileFormat,
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    })
  )

  // Todos os logs combinados
  transports.push(
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

// Criar logger
export const logger = winston.createLogger({
  level: env.isDevelopment ? 'debug' : 'info',
  format: customFormat,
  transports,
  exitOnError: false
})

// Stream para integração com Express Morgan (se necessário)
export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim())
  }
}

// Helper methods para facilitar uso
export const log = {
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  http: (message: string, meta?: any) => logger.http(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta)
}
