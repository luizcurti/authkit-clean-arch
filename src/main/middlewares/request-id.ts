import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'

export const REQUEST_ID_HEADER = 'x-request-id'

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const incomingId = req.get(REQUEST_ID_HEADER)
  const id = incomingId !== undefined && incomingId.trim().length > 0 ? incomingId : randomUUID()
  req.locals = { ...req.locals, requestId: id }
  res.set(REQUEST_ID_HEADER, id)
  next()
}
