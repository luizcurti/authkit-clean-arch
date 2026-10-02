export {}

// The jobs run on load, so each case loads one in isolation against recording doubles
type Batch = { processed: number, failed: number }

const flush = async (): Promise<void> => new Promise(resolve => setImmediate(resolve))

const loadJob = async (path: string, { connectError, useCase }: { connectError?: Error, useCase: jest.Mock }) => {
  const connection = {
    connect: connectError === undefined ? jest.fn().mockResolvedValue(undefined) : jest.fn().mockRejectedValue(connectError),
    disconnect: jest.fn().mockResolvedValue(undefined)
  }
  const log = { info: jest.fn(), error: jest.fn() }
  jest.isolateModules(() => {
    jest.doMock('@/infra/repos/postgres/helpers/connection', () => ({ PgConnection: { getInstance: () => connection } }))
    jest.doMock('@/main/factories/domain/use-cases', () => ({
      makeProcessOutboxEvents: () => useCase,
      makePurgeExpiredRefreshTokens: () => useCase
    }))
    jest.doMock('@/infra/logger', () => ({ log }))
    require(path)
  })
  await flush()
  return { connection, log }
}

describe('Jobs', () => {
  afterEach(() => {
    process.exitCode = undefined
  })

  describe('process-outbox-events', () => {
    const path = '@/main/jobs/process-outbox-events'

    it('should process batches until one comes back empty, then log the totals and disconnect', async () => {
      const batches: Batch[] = [{ processed: 2, failed: 1 }, { processed: 1, failed: 0 }, { processed: 0, failed: 0 }]
      const useCase = jest.fn(async () => batches.shift())

      const { connection, log } = await loadJob(path, { useCase })

      expect(connection.connect).toHaveBeenCalledTimes(1)
      expect(useCase).toHaveBeenCalledTimes(3)
      expect(log.info).toHaveBeenCalledWith('Processed outbox events', { processed: 3, failed: 1 })
      expect(connection.disconnect).toHaveBeenCalledTimes(1)
      expect(process.exitCode).toBeUndefined()
    })

    it('should stop after a single empty batch when nothing is pending', async () => {
      const useCase = jest.fn().mockResolvedValue({ processed: 0, failed: 0 })

      const { log } = await loadJob(path, { useCase })

      expect(useCase).toHaveBeenCalledTimes(1)
      expect(log.info).toHaveBeenCalledWith('Processed outbox events', { processed: 0, failed: 0 })
    })

    it('should disconnect, log the error and set exit code 1 when processing fails', async () => {
      const error = new Error('db_down')
      const useCase = jest.fn().mockRejectedValue(error)

      const { connection, log } = await loadJob(path, { useCase })

      expect(connection.disconnect).toHaveBeenCalledTimes(1)
      expect(log.error).toHaveBeenCalledWith('Outbox processing failed', { error: 'db_down', stack: error.stack })
      expect(process.exitCode).toBe(1)
    })

    it('should set exit code 1 without processing when connecting fails', async () => {
      const useCase = jest.fn()

      const { connection, log } = await loadJob(path, { useCase, connectError: new Error('refused') })

      expect(useCase).not.toHaveBeenCalled()
      expect(connection.disconnect).not.toHaveBeenCalled()
      expect(log.error).toHaveBeenCalledWith('Outbox processing failed', expect.objectContaining({ error: 'refused' }))
      expect(process.exitCode).toBe(1)
    })
  })

  describe('purge-expired-refresh-tokens', () => {
    const path = '@/main/jobs/purge-expired-refresh-tokens'

    it('should purge once, log how many were deleted and disconnect', async () => {
      const useCase = jest.fn().mockResolvedValue({ deleted: 7 })

      const { connection, log } = await loadJob(path, { useCase })

      expect(useCase).toHaveBeenCalledTimes(1)
      expect(log.info).toHaveBeenCalledWith('Purged expired refresh tokens', { deleted: 7 })
      expect(connection.disconnect).toHaveBeenCalledTimes(1)
      expect(process.exitCode).toBeUndefined()
    })

    it('should disconnect, log the error and set exit code 1 when purging fails', async () => {
      const error = new Error('db_down')
      const useCase = jest.fn().mockRejectedValue(error)

      const { connection, log } = await loadJob(path, { useCase })

      expect(connection.disconnect).toHaveBeenCalledTimes(1)
      expect(log.error).toHaveBeenCalledWith('Refresh token purge failed', { error: 'db_down', stack: error.stack })
      expect(process.exitCode).toBe(1)
    })
  })
})
