import './config/module-alias'

import 'reflect-metadata'
import { env } from '@/main/config/env'
import { PgConnection } from '@/infra/repos/postgres/helpers/connection'
import { log } from '@/infra/logger'

PgConnection.getInstance().connect()
  .then(async () => {
    const { app, ready } = await import('@/main/config/app')
    await ready
    app.listen(env.appPort, () => {
      log.info(`🚀 Server is running on port ${env.appPort}`)
      log.info(`📊 Environment: ${env.nodeEnv}`)
      log.info(`🔗 Health check: http://localhost:${env.appPort}/api/health`)
    })
  })
  .catch((err) => {
    log.error('Failed to start server', {
      error: err.message,
      stack: err.stack
    })
    process.exit(1)
  })
