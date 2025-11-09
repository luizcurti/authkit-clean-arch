import { ConnectionNotFoundError, TransactionNotFoundError } from '@/infra/repos/postgres/helpers'

describe('PostgreSQL Errors', () => {
  describe('ConnectionNotFoundError', () => {
    it('should create ConnectionNotFoundError with correct message and name', () => {
      const sut = new ConnectionNotFoundError()

      expect(sut.message).toBe('No connection was found')
      expect(sut.name).toBe('ConnectionNotFoundError')
      expect(sut).toBeInstanceOf(Error)
    })
  })

  describe('TransactionNotFoundError', () => {
    it('should create TransactionNotFoundError with correct message and name', () => {
      const sut = new TransactionNotFoundError()

      expect(sut.message).toBe('No transaction was found')
      expect(sut.name).toBe('TransactionNotFoundError')
      expect(sut).toBeInstanceOf(Error)
    })
  })
})