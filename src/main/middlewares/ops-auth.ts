import { createHash, timingSafeEqual } from 'crypto'
import { RequestHandler } from 'express'
import { env } from '@/main/config/env'

type Options = {
  opsToken?: string
  isProduction: boolean
}

const digest = (value: string): Buffer => createHash('sha256').update(value).digest()

// Without a token: open outside production, 404 in production
export const makeOpsAuth = ({ opsToken, isProduction }: Options): RequestHandler => (req, res, next) => {
  if (opsToken === undefined) {
    if (isProduction) {
      res.status(404).json({ error: 'Not found', requestId: req.locals?.requestId })
      return
    }
    next()
    return
  }
  const provided = req.get('authorization') ?? ''
  // Hashed, so the comparison is constant-time for any length
  if (timingSafeEqual(digest(provided), digest(`Bearer ${opsToken}`))) {
    next()
    return
  }
  res.status(401).json({ error: 'unauthorized', requestId: req.locals?.requestId })
}

export const opsAuth = makeOpsAuth({ opsToken: env.opsToken, isProduction: env.isProduction })
