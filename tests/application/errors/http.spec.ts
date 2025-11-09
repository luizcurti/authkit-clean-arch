import { ServerError, UnauthorizedError, ForbiddenError } from '@/application/errors'

describe('HTTP Errors', () => {
  describe('ServerError', () => {
    it('should create ServerError with default message and name', () => {
      const sut = new ServerError()

      expect(sut.message).toBe('Server failed. Try again later')
      expect(sut.name).toBe('ServerError')
    })

    it('should create ServerError and preserve original error stack', () => {
      const originalError = new Error('original error')
      const sut = new ServerError(originalError)

      expect(sut.message).toBe('Server failed. Try again later')
      expect(sut.name).toBe('ServerError')
      expect(sut.stack).toBe(originalError.stack)
    })

    it('should create ServerError with own stack when no error provided', () => {
      const sut = new ServerError()

      expect(sut.stack).toBeDefined()
      expect(sut.stack).toContain('ServerError')
    })
  })

  describe('UnauthorizedError', () => {
    it('should create UnauthorizedError with correct message and name', () => {
      const sut = new UnauthorizedError()

      expect(sut.message).toBe('unauthorized')
      expect(sut.name).toBe('UnauthorizedError')
    })
  })

  describe('ForbiddenError', () => {
    it('should create ForbiddenError with correct message and name', () => {
      const sut = new ForbiddenError()

      expect(sut.message).toBe('Access denied')
      expect(sut.name).toBe('ForbiddenError')
    })
  })
})