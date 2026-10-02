import { RequestHandler } from 'express'
import { Middleware } from '@/application/middlewares'

type Adapter = <T>(middleware: Middleware<T>) => RequestHandler

export const errorMessage = (data: unknown): string => data instanceof Error ? data.message : 'Unknown error'

export const adaptExpressMiddleware: Adapter = middleware => async (req, res, next) => {
  const { statusCode, data, headers } = await middleware.handle({ ...req.headers } as unknown as Parameters<typeof middleware.handle>[0])
  if (statusCode === 200) {
    const entries = Object.entries(data as Record<string, unknown>).filter(entry => entry[1])
    req.locals = {
      ...req.locals,
      ...Object.fromEntries(entries)
    }
    next()
  } else {
    if (headers !== undefined) res.set(headers)
    res.status(statusCode).json({ error: errorMessage(data), requestId: req.locals?.requestId })
  }
}
