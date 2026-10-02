import { UnauthorizedError, ServerError, BadGatewayError, ConflictError, NotFoundError } from '@/application/errors'

export type HttpResponse<T = unknown> = {
  statusCode: number
  data: T
  headers?: Record<string, string>
}

export const ok = <T> (data: T): HttpResponse<T> => ({
  statusCode: 200,
  data
})

export const noContent = (): HttpResponse<null> => ({
  statusCode: 204,
  data: null
})

export const badRequest = (error: Error): HttpResponse<Error> => ({
  statusCode: 400,
  data: error
})

export const unauthorized = (): HttpResponse<Error> => ({
  statusCode: 401,
  data: new UnauthorizedError()
})

// RFC 6750 §3. The error code is set only when a presented token was rejected
export const bearerChallenge = (error?: 'invalid_token'): HttpResponse<Error> => ({
  statusCode: 401,
  data: new UnauthorizedError(),
  headers: { 'WWW-Authenticate': error === undefined ? 'Bearer' : `Bearer error="${error}"` }
})

export const notFound = (resource: string): HttpResponse<Error> => ({
  statusCode: 404,
  data: new NotFoundError(resource)
})

export const conflict = (): HttpResponse<Error> => ({
  statusCode: 409,
  data: new ConflictError()
})

export const serverError = (error: unknown): HttpResponse<Error> => ({
  statusCode: 500,
  data: new ServerError(error instanceof Error ? error : undefined)
})

export const badGateway = (): HttpResponse<Error> => ({
  statusCode: 502,
  data: new BadGatewayError()
})
