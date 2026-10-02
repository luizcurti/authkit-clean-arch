import { UnauthorizedError, ServerError, ConflictError, NotFoundError } from '@/application/errors'
import { ok, noContent, badRequest, unauthorized, bearerChallenge, serverError, conflict, notFound } from '@/application/helpers'

describe('Http Helpers', () => {
  describe('ok', () => {
    it('should return status 200 and data', () => {
      const data = { message: 'success' }
      const result = ok(data)

      expect(result).toEqual({
        statusCode: 200,
        data
      })
    })
  })

  describe('conflict', () => {
    it('should return status 409 and ConflictError', () => {
      expect(conflict()).toEqual({ statusCode: 409, data: new ConflictError() })
    })
  })

  describe('noContent', () => {
    it('should return status 204 and no data', () => {
      expect(noContent()).toEqual({ statusCode: 204, data: null })
    })
  })

  describe('badRequest', () => {
    it('should return status 400 and error', () => {
      const error = new Error('bad request')
      const result = badRequest(error)

      expect(result).toEqual({
        statusCode: 400,
        data: error
      })
    })
  })

  describe('unauthorized', () => {
    it('should return status 401 and UnauthorizedError', () => {
      const result = unauthorized()

      expect(result).toEqual({
        statusCode: 401,
        data: new UnauthorizedError()
      })
    })
  })

  describe('bearerChallenge', () => {
    it('should return 401 with a bare Bearer challenge when no token was presented', () => {
      expect(bearerChallenge()).toEqual({
        statusCode: 401,
        data: new UnauthorizedError(),
        headers: { 'WWW-Authenticate': 'Bearer' }
      })
    })

    it('should include the error code when a token was rejected', () => {
      expect(bearerChallenge('invalid_token').headers).toEqual({ 'WWW-Authenticate': 'Bearer error="invalid_token"' })
    })
  })

  describe('notFound', () => {
    it('should return status 404 and NotFoundError for the resource', () => {
      expect(notFound('User')).toEqual({
        statusCode: 404,
        data: new NotFoundError('User')
      })
    })
  })

  describe('serverError', () => {
    it('should return status 500 and ServerError with Error instance', () => {
      const error = new Error('internal error')
      const result = serverError(error)

      expect(result).toEqual({
        statusCode: 500,
        data: new ServerError(error)
      })
    })

    it('should return status 500 and ServerError with undefined when error is not Error instance', () => {
      const error = 'string error'
      const result = serverError(error)

      expect(result).toEqual({
        statusCode: 500,
        data: new ServerError(undefined)
      })
    })
  })
})
