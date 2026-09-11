import './config/module-alias'

import 'reflect-metadata'
import { Server } from 'http'
import { env } from '@/main/config/env'
import { PgConnection } from '@/infra/repos/postgres/helpers/connection'
import { log } from '@/infra/logger'

const shutdown = (server: Server, signal: string): void => {
  log.info(`${signal} received, shutting down gracefully`)
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

    process.on('SIGTERM', () => shutdown(server, 'SIGTERM'))
    process.on('SIGINT', () => shutdown(server, 'SIGINT'))
  })
  .catch((err) => {
    log.error('Failed to start server', {
      error: err.message,
      stack: err.stack
    })
    process.exit(1)
  })
