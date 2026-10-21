import { ConflictError, NotFoundError, ServerError, UnauthorizedError } from '@/application/errors'

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

  describe('ConflictError', () => {
    it('should create ConflictError with message and name', () => {
      const sut = new ConflictError()

      expect(sut.message).toBe('The resource was modified by another request. Retry')
      expect(sut.name).toBe('ConflictError')
    })
  })

  describe('NotFoundError', () => {
    it('should name the missing resource', () => {
      const sut = new NotFoundError('User')

      expect(sut.message).toBe('User not found')
      expect(sut.name).toBe('NotFoundError')
    })
  })
})
