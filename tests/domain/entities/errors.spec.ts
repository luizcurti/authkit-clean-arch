import { AuthenticationError, ConcurrentModificationError, ExternalServiceError, UserNotFoundError } from '@/domain/entities/errors'

describe('Domain errors', () => {
  it.each([
    [new AuthenticationError(), 'AuthenticationError', 'Authentication failed'],
    [new ConcurrentModificationError(), 'ConcurrentModificationError', 'The resource was modified concurrently'],
    [new ExternalServiceError(), 'ExternalServiceError', 'External service is currently unavailable'],
    [new UserNotFoundError(), 'UserNotFoundError', 'User not found']
  ])('should create %p with its name and message', (error, name, message) => {
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe(name)
    expect(error.message).toBe(message)
  })

  it('should keep the cause of an ExternalServiceError', () => {
    const cause = new Error('timeout')

    expect(new ExternalServiceError(cause).cause).toBe(cause)
  })
})
