import { json, Express } from 'express'
import cors, { CorsOptions } from 'cors'
import helmet from 'helmet'
import { httpLogger } from '@/main/middlewares/http-logger'
import { globalRateLimiter } from '@/main/middlewares/rate-limiter'
import { requestId } from '@/main/middlewares/request-id'
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
  // Request correlation id (must run before logging so it can be included in log context)
  app.use(requestId)

  // Security headers (CSP disabled: Swagger UI at /api-docs relies on inline scripts)
  app.use(helmet({ contentSecurityPolicy: false }))

  // CORS
  app.use(cors(buildCorsOptions()))

  // Rate limiting
  app.use(globalRateLimiter)

  // HTTP request logging
  app.use(httpLogger)

  // Body parser
  app.use(json())

  // Content type
  app.use((req, res, next) => {
    res.type('json')
    next()
  })
}
