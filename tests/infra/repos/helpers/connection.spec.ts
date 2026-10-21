import { DataSource } from 'typeorm'

import { PgConnection, ConnectionNotFoundError } from '@/infra/repos/postgres/helpers'
import { PgUser } from '@/infra/repos/postgres/entities'

jest.mock('typeorm', () => ({
  Entity: jest.fn(() => () => {}),
  PrimaryGeneratedColumn: jest.fn(() => () => {}),
  Column: jest.fn(() => () => {}),
  Index: jest.fn(() => () => {}),
  CreateDateColumn: jest.fn(() => () => {}),
  Check: jest.fn(() => () => {}),
  DataSource: jest.fn()
}))

describe('PgConnection', () => {
  let initializeSpy: jest.Mock
  let destroySpy: jest.Mock
  let createQueryRunnerSpy: jest.Mock
  let startTransactionSpy: jest.Mock
  let commitTransactionSpy: jest.Mock
  let rollbackTransactionSpy: jest.Mock
  let releaseSpy: jest.Mock
  let getRepositorySpy: jest.Mock
  let querySpy: jest.Mock
  let sut: PgConnection

  beforeEach(() => {
    startTransactionSpy = jest.fn()
    commitTransactionSpy = jest.fn()
    rollbackTransactionSpy = jest.fn()
    releaseSpy = jest.fn()
    getRepositorySpy = jest.fn().mockReturnValue('any_repo')
    querySpy = jest.fn().mockResolvedValue('any_result')
    createQueryRunnerSpy = jest.fn().mockReturnValue({
      startTransaction: startTransactionSpy,
      commitTransaction: commitTransactionSpy,
      rollbackTransaction: rollbackTransactionSpy,
      release: releaseSpy,
      manager: {
        getRepository: getRepositorySpy
      }
    })
    initializeSpy = jest.fn().mockImplementation(function (this: any) {
      this.isInitialized = true
      return Promise.resolve()
    })
    destroySpy = jest.fn().mockImplementation(function (this: any) {
      this.isInitialized = false
      return Promise.resolve()
    })
    jest.mocked(DataSource).mockReset().mockImplementation(function (this: any) {
      this.isInitialized = false
      this.initialize = initializeSpy
      this.destroy = destroySpy
      this.createQueryRunner = createQueryRunnerSpy
      this.getRepository = getRepositorySpy
      this.query = querySpy
    } as any)

    sut = PgConnection.getInstance()
  })

  it('should have only one instance', () => {
    const sut2 = PgConnection.getInstance()

    expect(sut).toBe(sut2)
  })

  it('should create a new connection', async () => {
    await sut.connect()

    expect(DataSource).toHaveBeenCalledTimes(1)
    expect(initializeSpy).toHaveBeenCalledTimes(1)

    await sut.disconnect()
  })

  it('should reuse an existing connection', async () => {
    await sut.connect()
    await sut.connect()

    expect(DataSource).toHaveBeenCalledTimes(1)
    expect(initializeSpy).toHaveBeenCalledTimes(1)

    await sut.disconnect()
  })

  it('should close connection', async () => {
    await sut.connect()
    await sut.disconnect()

    expect(destroySpy).toHaveBeenCalledWith()
    expect(destroySpy).toHaveBeenCalledTimes(1)
  })

  it('should return ConnectionNotFoundError on disconnect if connection is not found', async () => {
    const promise = sut.disconnect()

    expect(destroySpy).not.toHaveBeenCalledWith()
    await expect(promise).rejects.toThrow(new ConnectionNotFoundError())
  })

  describe('transaction', () => {
    it('should commit, release and return the result when work resolves', async () => {
      await sut.connect()

      const result = await sut.transaction(async () => 'any_result')

      expect(startTransactionSpy).toHaveBeenCalledTimes(1)
      expect(commitTransactionSpy).toHaveBeenCalledTimes(1)
      expect(rollbackTransactionSpy).not.toHaveBeenCalled()
      expect(releaseSpy).toHaveBeenCalledTimes(1)
      expect(result).toBe('any_result')

      await sut.disconnect()
    })

    it('should roll back, release and rethrow when work rejects', async () => {
      await sut.connect()
      const error = new Error('work_error')

      const promise = sut.transaction(async () => { throw error })

      await expect(promise).rejects.toThrow(error)
      expect(rollbackTransactionSpy).toHaveBeenCalledTimes(1)
      expect(commitTransactionSpy).not.toHaveBeenCalled()
      expect(releaseSpy).toHaveBeenCalledTimes(1)

      await sut.disconnect()
    })

    it('should roll back, release and rethrow when committing fails', async () => {
      await sut.connect()
      const commitError = new Error('commit_error')
      commitTransactionSpy.mockRejectedValueOnce(commitError)

      const promise = sut.transaction(async () => 'any_result')

      await expect(promise).rejects.toThrow(commitError)
      expect(rollbackTransactionSpy).toHaveBeenCalledTimes(1)
      expect(releaseSpy).toHaveBeenCalledTimes(1)

      await sut.disconnect()
    })

    it('should still release the query runner when rolling back fails, rethrowing the rollback error', async () => {
      await sut.connect()
      const rollbackError = new Error('rollback_error')
      rollbackTransactionSpy.mockRejectedValueOnce(rollbackError)

      const promise = sut.transaction(async () => { throw new Error('work_error') })

      await expect(promise).rejects.toThrow(rollbackError)
      expect(releaseSpy).toHaveBeenCalledTimes(1)

      await sut.disconnect()
    })

    it('should return ConnectionNotFoundError if connection is not found', async () => {
      const promise = sut.transaction(async () => 'any_result')

      await expect(promise).rejects.toThrow(new ConnectionNotFoundError())
      expect(startTransactionSpy).not.toHaveBeenCalled()
    })

    it('should give repositories the transaction query runner only inside work', async () => {
      const transactionGetRepository = jest.fn().mockReturnValue('transaction_repo')
      createQueryRunnerSpy.mockReturnValueOnce({
        startTransaction: startTransactionSpy,
        commitTransaction: commitTransactionSpy,
        rollbackTransaction: rollbackTransactionSpy,
        release: releaseSpy,
        manager: { getRepository: transactionGetRepository }
      })
      await sut.connect()

      const inside = await sut.transaction(async () => sut.getRepository(PgUser))
      const outside = sut.getRepository(PgUser)

      expect(inside).toBe('transaction_repo')
      expect(outside).toBe('any_repo')

      await sut.disconnect()
    })

    it('should join the open transaction instead of starting a nested one', async () => {
      await sut.connect()

      const result = await sut.transaction(async () => sut.transaction(async () => 'inner_result'))

      expect(createQueryRunnerSpy).toHaveBeenCalledTimes(1)
      expect(startTransactionSpy).toHaveBeenCalledTimes(1)
      expect(commitTransactionSpy).toHaveBeenCalledTimes(1)
      expect(result).toBe('inner_result')

      await sut.disconnect()
    })

    it('should keep concurrent transactions isolated from each other', async () => {
      const runners = ['repo_a', 'repo_b'].map(repo => ({
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: { getRepository: jest.fn().mockReturnValue(repo) }
      }))
      createQueryRunnerSpy.mockReturnValueOnce(runners[0]).mockReturnValueOnce(runners[1])
      await sut.connect()
      let releaseA!: () => void
      const aCanFinish = new Promise<void>(resolve => { releaseA = resolve })

      const a = sut.transaction(async () => {
        await aCanFinish
        return sut.getRepository(PgUser)
      })
      const b = sut.transaction(async () => sut.getRepository(PgUser))
      const resultB = await b
      releaseA()
      const resultA = await a

      expect(resultA).toBe('repo_a')
      expect(resultB).toBe('repo_b')

      await sut.disconnect()
    })
  })

  it('should get repository', async () => {
    await sut.connect()
    const repository = sut.getRepository(PgUser)

    expect(getRepositorySpy).toHaveBeenCalledWith(PgUser)
    expect(getRepositorySpy).toHaveBeenCalledTimes(1)
    expect(repository).toBe('any_repo')

    await sut.disconnect()
  })

  it('should return ConnectionNotFoundError on getRepository if connection is not found', async () => {
    expect(getRepositorySpy).not.toHaveBeenCalledWith()
    await expect(() => sut.getRepository(PgUser)).toThrow(new ConnectionNotFoundError())
  })

  it('should run a query', async () => {
    await sut.connect()
    const result = await sut.runQuery('SELECT 1')

    expect(querySpy).toHaveBeenCalledWith('SELECT 1')
    expect(querySpy).toHaveBeenCalledTimes(1)
    expect(result).toBe('any_result')

    await sut.disconnect()
  })

  it('should return ConnectionNotFoundError on runQuery if connection is not found', async () => {
    const promise = sut.runQuery('SELECT 1')

    expect(querySpy).not.toHaveBeenCalledWith()
    await expect(promise).rejects.toThrow(new ConnectionNotFoundError())
  })
})
