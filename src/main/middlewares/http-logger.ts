import { Request, Response, NextFunction } from 'express'
import { log } from '@/infra/logger'

export const httpLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now()
  
  // Captura quando a resposta é finalizada
  res.on('finish', () => {
    const duration = Date.now() - startTime
    const { method, originalUrl, ip } = req
    const { statusCode } = res
    
    const logData = {
      method,
      url: originalUrl,
      statusCode,
      duration: `${duration}ms`,
      ip: ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent') || 'unknown'
    }
    
    // Log baseado no status code
    if (statusCode >= 500) {
      log.error(`${method} ${originalUrl} - ${statusCode}`, logData)
    } else if (statusCode >= 400) {
      log.warn(`${method} ${originalUrl} - ${statusCode}`, logData)
    } else {
      log.http(`${method} ${originalUrl} - ${statusCode}`, logData)
    }
  })
  
  next()
}
