import rateLimit, { Options } from 'express-rate-limit'
import { Request, Response } from 'express'
import { env } from '@/main/config/env'

const jsonHandler = (message: string) => (req: Request, res: Response): void => {
  res.status(429).json({ error: message, requestId: req.locals?.requestId })
}

const baseOptions: Partial<Options> = {
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest
}

export const globalRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: env.rateLimitPerMinute,
  handler: jsonHandler('Too many requests, please try again later')
})

export const authRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: env.authRateLimitPerMinute,
  handler: jsonHandler('Too many login attempts, please try again later')
})
