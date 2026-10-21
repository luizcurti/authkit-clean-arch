import 'reflect-metadata'
import { Server } from 'http'
import { env } from '@/main/config/env'
import { PgConnection } from '@/infra/repos/postgres/helpers/connection'
import { log } from '@/infra/logger'
import { makeProcessOutboxEvents, makePurgeExpiredRefreshTokens } from '@/main/factories/domain/use-cases'

// 0 disables the task. Runs never overlap, and the timer does not keep the process alive
const scheduleEvery = (intervalMs: number, task: () => Promise<void>): NodeJS.Timeout | undefined => {
  if (intervalMs === 0) return undefined
  let running = false
  const timer = setInterval(() => {
    if (running) return
    running = true
    task().finally(() => { running = false })
  }, intervalMs)
  timer.unref()
  return timer
}

const startBackgroundJobs = (): Array<NodeJS.Timeout | undefined> => {
  const purge = makePurgeExpiredRefreshTokens()
  const processOutboxEvents = makeProcessOutboxEvents()
  return [
    scheduleEvery(env.refreshTokenPurgeIntervalMs, async () => {
      await purge()
        .then(({ deleted }) => log.info('Purged expired refresh tokens', { deleted }))
        .catch((err: Error) => log.error('Refresh token purge failed', { error: err.message }))
    }),
    scheduleEvery(env.outboxPollIntervalMs, async () => {
      await processOutboxEvents()
        .then(({ processed, failed }) => {
          if (failed > 0) log.warn('Some outbox events failed and will be retried', { processed, failed })
          else if (processed > 0) log.info('Processed outbox events', { processed })
        })
        .catch((err: Error) => log.error('Outbox processing failed', { error: err.message }))
    })
  ]
}

const shutdown = (server: Server, signal: string, timers: Array<NodeJS.Timeout | undefined>): void => {
  log.info(`${signal} received, shutting down gracefully`)
  timers.forEach(timer => clearInterval(timer))
  server.close(() => {
    PgConnection.getInstance().disconnect()
      .catch((err) => log.error('Error disconnecting database', { error: err.message }))
      .finally(() => process.exit(0))
  })
}

PgConnection.getInstance().connect()
  .then(async () => {
    const { app, ready } = await import('@/main/config/app')
    await ready
    const server = app.listen(env.appPort, () => {
      log.info(`🚀 Server is running on port ${env.appPort}`)
      log.info(`📊 Environment: ${env.nodeEnv}`)
      log.info(`🔗 Health check: http://localhost:${env.appPort}/api/health`)
    })

    const timers = startBackgroundJobs()

    process.on('SIGTERM', () => shutdown(server, 'SIGTERM', timers))
    process.on('SIGINT', () => shutdown(server, 'SIGINT', timers))
  })
  .catch((err) => {
    log.error('Failed to start server', {
      error: err.message,
      stack: err.stack
    })
    process.exit(1)
  })
