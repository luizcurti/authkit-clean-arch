import { json, Express } from 'express'
import cors, { CorsOptions } from 'cors'
import helmet from 'helmet'
import { httpLogger } from '@/main/middlewares/http-logger'
import { globalRateLimiter } from '@/main/middlewares/rate-limiter'
import { requestId } from '@/main/middlewares/request-id'
import { requestMetrics } from '@/main/middlewares/metrics'
import { env } from '@/main/config/env'
import { log } from '@/infra/logger'

const buildCorsOptions = (): CorsOptions => {
  const { corsAllowedOrigins, isProduction } = env

  if (corsAllowedOrigins.length > 0) {
    return { origin: corsAllowedOrigins }
  }

  if (isProduction) {
    log.warn('CORS_ALLOWED_ORIGINS is not set in production - denying all cross-origin requests')
    return { origin: false }
  }

  return { origin: true }
}

export const setupMiddlewares = (app: Express): void => {
  // Drives req.ip, which the rate limiter keys on (ADR-0008)
  app.set('trust proxy', env.trustProxyHops)

  // Before logging, so log lines carry the request id
  app.use(requestId)

  app.use(requestMetrics)

  // Default CSP on every route, Swagger UI included (ADR-0012)
  app.use(helmet())

  app.use(cors(buildCorsOptions()))

  app.use(globalRateLimiter)

  app.use(httpLogger)

  // Bodies over 100 KB: 413 from the error handler
  app.use(json())

  // JSON by default under /api only, so the Swagger UI stays HTML
  app.use('/api', (req, res, next) => {
    res.type('json')
    next()
  })
}
