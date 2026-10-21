export {}

// The entry point boots on load, so each case loads it in isolation against recording doubles
type Options = {
  connectError?: Error
  disconnectError?: Error
  refreshTokenPurgeIntervalMs?: number
  outboxPollIntervalMs?: number
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

describe('server entry point', () => {
  let exitSpy: jest.SpyInstance
  let onSpy: jest.SpyInstance
  let signalHandlers: Record<string, () => void>

  beforeEach(() => {
    jest.useFakeTimers()
    signalHandlers = {}
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never)
    onSpy = jest.spyOn(process, 'on').mockImplementation(((signal: string, handler: () => void) => {
      signalHandlers[signal] = handler
      return process
    }) as never)
  })

  afterEach(() => {
    jest.useRealTimers()
    exitSpy.mockRestore()
    onSpy.mockRestore()
  })

  const boot = async (options: Options = {}) => {
    const connection = {
      connect: options.connectError === undefined ? jest.fn().mockResolvedValue(undefined) : jest.fn().mockRejectedValue(options.connectError),
      disconnect: options.disconnectError === undefined ? jest.fn().mockResolvedValue(undefined) : jest.fn().mockRejectedValue(options.disconnectError)
    }
    const server = { close: jest.fn((callback: () => void) => callback()) }
    const app = { listen: jest.fn((port: number, callback: () => void) => { callback(); return server }) }
    const purge = jest.fn().mockResolvedValue({ deleted: 0 })
    const processOutboxEvents = jest.fn().mockResolvedValue({ processed: 0, failed: 0 })
    const log = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/main/config/env', () => ({
        env: {
          appPort: 1234,
          nodeEnv: 'test',
          refreshTokenPurgeIntervalMs: options.refreshTokenPurgeIntervalMs ?? 60000,
          outboxPollIntervalMs: options.outboxPollIntervalMs ?? 1000
        }
      }))
      jest.doMock('@/infra/repos/postgres/helpers/connection', () => ({ PgConnection: { getInstance: () => connection } }))
      jest.doMock('@/infra/logger', () => ({ log }))
      jest.doMock('@/main/factories/domain/use-cases', () => ({
        makePurgeExpiredRefreshTokens: () => purge,
        makeProcessOutboxEvents: () => processOutboxEvents
      }))
      jest.doMock('@/main/config/app', () => ({ app, ready: Promise.resolve() }))
      require('@/main/index')
      await flush()
    })
    await flush()
    return { connection, server, app, purge, processOutboxEvents, log }
  }

  describe('on start', () => {
    it('should connect to the database, then listen on the configured port', async () => {
      const { connection, app, log } = await boot()

      expect(connection.connect).toHaveBeenCalledTimes(1)
      expect(app.listen).toHaveBeenCalledWith(1234, expect.any(Function))
      expect(log.info).toHaveBeenCalledWith('🚀 Server is running on port 1234')
      expect(log.info).toHaveBeenCalledWith('📊 Environment: test')
      expect(log.info).toHaveBeenCalledWith('🔗 Health check: http://localhost:1234/api/health')
    })

    it('should register graceful shutdown on SIGTERM and SIGINT', async () => {
      await boot()

      expect(Object.keys(signalHandlers).sort()).toEqual(['SIGINT', 'SIGTERM'])
    })

    it('should log and exit with 1 when the database is unreachable', async () => {
      const error = new Error('ECONNREFUSED')

      const { app, log } = await boot({ connectError: error })

      expect(app.listen).not.toHaveBeenCalled()
      expect(log.error).toHaveBeenCalledWith('Failed to start server', { error: 'ECONNREFUSED', stack: error.stack })
      expect(exitSpy).toHaveBeenCalledWith(1)
    })
  })

  describe('background jobs', () => {
    it('should purge expired refresh tokens on every interval and log how many', async () => {
      const { purge, log } = await boot({ refreshTokenPurgeIntervalMs: 60000 })
      purge.mockResolvedValueOnce({ deleted: 3 })

      await jest.advanceTimersByTimeAsync(60000)

      expect(purge).toHaveBeenCalledTimes(1)
      expect(log.info).toHaveBeenCalledWith('Purged expired refresh tokens', { deleted: 3 })
    })

    it('should log a failed purge and keep running', async () => {
      const { purge, log } = await boot({ refreshTokenPurgeIntervalMs: 60000 })
      purge.mockRejectedValueOnce(new Error('db_down'))

      await jest.advanceTimersByTimeAsync(120000)

      expect(log.error).toHaveBeenCalledWith('Refresh token purge failed', { error: 'db_down' })
      expect(purge).toHaveBeenCalledTimes(2)
    })

    it('should process outbox events on every interval, logging only when something happened', async () => {
      const { processOutboxEvents, log } = await boot({ outboxPollIntervalMs: 1000 })

      await jest.advanceTimersByTimeAsync(1000)
      processOutboxEvents.mockResolvedValueOnce({ processed: 2, failed: 0 })
      await jest.advanceTimersByTimeAsync(1000)
      processOutboxEvents.mockResolvedValueOnce({ processed: 1, failed: 1 })
      await jest.advanceTimersByTimeAsync(1000)

      expect(processOutboxEvents).toHaveBeenCalledTimes(3)
      expect(log.info).toHaveBeenCalledWith('Processed outbox events', { processed: 2 })
      expect(log.info).toHaveBeenCalledTimes(4) // three start-up lines plus this one
      expect(log.warn).toHaveBeenCalledWith('Some outbox events failed and will be retried', { processed: 1, failed: 1 })
    })

    it('should log a failed outbox run and keep running', async () => {
      const { processOutboxEvents, log } = await boot({ outboxPollIntervalMs: 1000 })
      processOutboxEvents.mockRejectedValueOnce(new Error('db_down'))

      await jest.advanceTimersByTimeAsync(2000)

      expect(log.error).toHaveBeenCalledWith('Outbox processing failed', { error: 'db_down' })
      expect(processOutboxEvents).toHaveBeenCalledTimes(2)
    })

    it('should not start a run while the previous one is still going', async () => {
      const { processOutboxEvents } = await boot({ outboxPollIntervalMs: 1000 })
      let finish!: () => void
      processOutboxEvents.mockImplementationOnce(async () => new Promise(resolve => { finish = () => resolve({ processed: 0, failed: 0 }) }))

      await jest.advanceTimersByTimeAsync(3000)
      expect(processOutboxEvents).toHaveBeenCalledTimes(1)

      finish()
      await jest.advanceTimersByTimeAsync(1000)
      expect(processOutboxEvents).toHaveBeenCalledTimes(2)
    })

    it('should not schedule a job whose interval is 0', async () => {
      const { purge, processOutboxEvents } = await boot({ refreshTokenPurgeIntervalMs: 0, outboxPollIntervalMs: 0 })

      await jest.advanceTimersByTimeAsync(3600000)

      expect(purge).not.toHaveBeenCalled()
      expect(processOutboxEvents).not.toHaveBeenCalled()
    })
  })

  describe.each(['SIGTERM', 'SIGINT'])('on %s', (signal) => {
    it('should stop the jobs, close the server, disconnect and exit with 0', async () => {
      const { server, connection, processOutboxEvents, log } = await boot({ outboxPollIntervalMs: 1000 })

      signalHandlers[signal]()
      await flush()
      await jest.advanceTimersByTimeAsync(5000)

      expect(log.info).toHaveBeenCalledWith(`${signal} received, shutting down gracefully`)
      expect(server.close).toHaveBeenCalledTimes(1)
      expect(connection.disconnect).toHaveBeenCalledTimes(1)
      expect(processOutboxEvents).not.toHaveBeenCalled()
      expect(exitSpy).toHaveBeenCalledWith(0)
    })

    it('should still exit with 0 when disconnecting fails, logging the error', async () => {
      const { log } = await boot({ disconnectError: new Error('already closed') })

      signalHandlers[signal]()
      await flush()

      expect(log.error).toHaveBeenCalledWith('Error disconnecting database', { error: 'already closed' })
      expect(exitSpy).toHaveBeenCalledWith(0)
    })
  })
})
