import { UnauthorizedError, ServerError, ForbiddenError } from '@/application/errors'
import { ok, badRequest, unauthorized, forbidden, serverError } from '@/application/helpers'

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

  describe('forbidden', () => {
    it('should return status 403 and ForbiddenError', () => {
      const result = forbidden()

      expect(result).toEqual({
        statusCode: 403,
        data: new ForbiddenError()
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