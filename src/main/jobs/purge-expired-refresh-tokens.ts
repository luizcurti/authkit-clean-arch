import 'reflect-metadata'
import { PgConnection } from '@/infra/repos/postgres/helpers/connection'
import { makePurgeExpiredRefreshTokens } from '@/main/factories/domain/use-cases'
import { log } from '@/infra/logger'

// `npm run db:purge-refresh-tokens`, for an external scheduler
const run = async (): Promise<void> => {
  const connection = PgConnection.getInstance()
  await connection.connect()
  try {
    const { deleted } = await makePurgeExpiredRefreshTokens()()
    log.info('Purged expired refresh tokens', { deleted })
  } finally {
    await connection.disconnect()
  }
}

run().catch((err: Error) => {
  log.error('Refresh token purge failed', { error: err.message, stack: err.stack })
  process.exitCode = 1
})
