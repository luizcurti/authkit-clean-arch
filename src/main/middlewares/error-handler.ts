import { ErrorRequestHandler } from 'express'
import { ServerError } from '@/application/errors'
import { log } from '@/infra/logger'

type HttpError = Error & { status?: number, type?: string }

const clientErrorMessages: Record<string, string> = {
  'entity.parse.failed': 'Malformed JSON body',
  'entity.too.large': 'Request body too large'
}

// Last in the chain: answers body-parser failures and unexpected throws with the JSON error shape
export const errorHandler: ErrorRequestHandler = (error: HttpError, req, res, _next) => {
  const isClientError = error.status !== undefined && error.status >= 400 && error.status < 500
  if (!isClientError) {
    log.error('Unhandled request error', { error: error.message, stack: error.stack, requestId: req.locals?.requestId })
  }
  const status = isClientError ? error.status! : 500
  const message = isClientError ? clientErrorMessages[error.type ?? ''] ?? 'Bad request' : new ServerError().message
  res.status(status).json({ error: message, requestId: req.locals?.requestId })
}
