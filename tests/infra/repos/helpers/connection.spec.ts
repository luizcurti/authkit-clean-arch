import { DataSource } from 'typeorm'

import { PgConnection, ConnectionNotFoundError, TransactionNotFoundError } from '@/infra/repos/postgres/helpers'
import { PgUser } from '@/infra/repos/postgres/entities'

jest.mock('typeorm', () => ({
  Entity: jest.fn(() => () => {}),
  PrimaryGeneratedColumn: jest.fn(() => () => {}),
  Column: jest.fn(() => () => {}),
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
  let sut: PgConnection

  beforeEach(() => {
    startTransactionSpy = jest.fn()
    commitTransactionSpy = jest.fn()
    rollbackTransactionSpy = jest.fn()
    releaseSpy = jest.fn()
    getRepositorySpy = jest.fn().mockReturnValue('any_repo')
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

  it('should open transaction', async () => {
    await sut.connect()
    await sut.openTransaction()

    expect(startTransactionSpy).toHaveBeenCalledWith()
    expect(startTransactionSpy).toHaveBeenCalledTimes(1)
    expect(createQueryRunnerSpy).toHaveBeenCalledWith()
    expect(createQueryRunnerSpy).toHaveBeenCalledTimes(1)

    await sut.disconnect()
  })

  it('should return ConnectionNotFoundError on openTransaction if connection is not found', async () => {
    const promise = sut.openTransaction()

    expect(startTransactionSpy).not.toHaveBeenCalledWith()
    await expect(promise).rejects.toThrow(new ConnectionNotFoundError())
  })

  it('should close transaction', async () => {
    await sut.connect()
    await sut.openTransaction()
    await sut.closeTransaction()

    expect(releaseSpy).toHaveBeenCalledWith()
    expect(releaseSpy).toHaveBeenCalledTimes(1)

    await sut.disconnect()
  })

  it('should return TransactionNotFoundError on closeTransaction if query runner is not found', async () => {
    const promise = sut.closeTransaction()

    expect(releaseSpy).not.toHaveBeenCalledWith()
    await expect(promise).rejects.toThrow(new TransactionNotFoundError())
  })

  it('should commit transaction', async () => {
    await sut.connect()
    await sut.openTransaction()
    await sut.commit()

    expect(commitTransactionSpy).toHaveBeenCalledWith()
    expect(commitTransactionSpy).toHaveBeenCalledTimes(1)

    await sut.disconnect()
  })

  it('should return TransactionNotFoundError on commit if query runner is not found', async () => {
    const promise = sut.commit()

    expect(commitTransactionSpy).not.toHaveBeenCalledWith()
    await expect(promise).rejects.toThrow(new TransactionNotFoundError())
  })

  it('should rollback transaction', async () => {
    await sut.connect()
    await sut.openTransaction()
    await sut.rollback()

    expect(rollbackTransactionSpy).toHaveBeenCalledWith()
    expect(rollbackTransactionSpy).toHaveBeenCalledTimes(1)

    await sut.disconnect()
  })

  it('should return TransactionNotFoundError on rollback if query runner is not found', async () => {
    const promise = sut.rollback()

    expect(rollbackTransactionSpy).not.toHaveBeenCalledWith()
    await expect(promise).rejects.toThrow(new TransactionNotFoundError())
  })

  it('should get repository from transaction', async () => {
    await sut.connect()
    await sut.openTransaction()
    const repository = sut.getRepository(PgUser)

    expect(getRepositorySpy).toHaveBeenCalledWith(PgUser)
    expect(getRepositorySpy).toHaveBeenCalledTimes(1)
    expect(repository).toBe('any_repo')

    await sut.disconnect()
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
})
