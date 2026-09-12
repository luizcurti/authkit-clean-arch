import rateLimit, { Options } from 'express-rate-limit'
import { Request, Response } from 'express'
import { env } from '@/main/config/env'

const jsonHandler = (message: string) => (req: Request, res: Response): void => {
  res.status(429).json({ error: message })
}

const baseOptions: Partial<Options> = {
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest
}

export const globalRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: 100,
  handler: jsonHandler('Too many requests, please try again later')
})

export const authRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: 10,
  handler: jsonHandler('Too many login attempts, please try again later')
})
