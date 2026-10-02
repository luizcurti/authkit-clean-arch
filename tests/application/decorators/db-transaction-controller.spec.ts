import { mock, MockProxy } from 'jest-mock-extended'

import { Controller } from '@/application/controllers'
import { DbTransaction } from '@/application/contracts'
import { DbTransactionController } from '@/application/decorators'

describe('DbTransactionController', () => {
  let db: MockProxy<DbTransaction>
  let decoratee: MockProxy<Controller>
  let sut: DbTransactionController
  let committed: boolean
  let rolledBack: boolean

  beforeEach(() => {
    committed = false
    rolledBack = false
    db = mock()
    db.transaction.mockImplementation(async work => {
      try {
        const result = await work()
        committed = true
        return result
      } catch (error) {
        rolledBack = true
        throw error
      }
    })
    decoratee = mock()
    decoratee.handle.mockResolvedValue({ statusCode: 200, data: { any: 'data' } })
    sut = new DbTransactionController(decoratee, db)
  })

  it('should extend Controller and add no validators', () => {
    expect(sut).toBeInstanceOf(Controller)
    expect(sut.buildValidators({ any: 'any' })).toEqual([])
  })

  it('should run the decoratee inside a transaction', async () => {
    await sut.perform({ any: 'any' })

    expect(db.transaction).toHaveBeenCalledTimes(1)
    expect(decoratee.handle).toHaveBeenCalledWith({ any: 'any' })
  })

  it('should commit and return the decoratee response on success', async () => {
    const httpResponse = await sut.perform({ any: 'any' })

    expect(committed).toBe(true)
    expect(httpResponse).toEqual({ statusCode: 200, data: { any: 'data' } })
  })

  it('should commit on a 4xx response, keeping side effects such as a token family revocation', async () => {
    decoratee.handle.mockResolvedValueOnce({ statusCode: 401, data: new Error('unauthorized') })

    const httpResponse = await sut.perform({ any: 'any' })

    expect(committed).toBe(true)
    expect(rolledBack).toBe(false)
    expect(httpResponse.statusCode).toBe(401)
  })

  it('should roll back and still return the response on a 5xx response', async () => {
    decoratee.handle.mockResolvedValueOnce({ statusCode: 500, data: new Error('server error') })

    const httpResponse = await sut.perform({ any: 'any' })

    expect(rolledBack).toBe(true)
    expect(committed).toBe(false)
    expect(httpResponse).toEqual({ statusCode: 500, data: new Error('server error') })
  })

  it('should roll back and rethrow if the decoratee throws', async () => {
    const error = new Error('decoratee_error')
    decoratee.handle.mockRejectedValueOnce(error)

    await expect(sut.perform({ any: 'any' })).rejects.toThrow(error)
    expect(rolledBack).toBe(true)
  })
})
