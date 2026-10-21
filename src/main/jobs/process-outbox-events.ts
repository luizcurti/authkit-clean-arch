import 'reflect-metadata'
import { PgConnection } from '@/infra/repos/postgres/helpers/connection'
import { makeProcessOutboxEvents } from '@/main/factories/domain/use-cases'
import { log } from '@/infra/logger'

// `npm run outbox:process`, for an external scheduler. Safe next to the in-process worker (ADR-0016)
const run = async (): Promise<void> => {
  const connection = PgConnection.getInstance()
  await connection.connect()
  try {
    const processOutboxEvents = makeProcessOutboxEvents()
    let total = { processed: 0, failed: 0 }
    for (;;) {
      const batch = await processOutboxEvents()
      total = { processed: total.processed + batch.processed, failed: total.failed + batch.failed }
      // Empty batch: nothing left to claim
      if (batch.processed + batch.failed === 0) break
    }
    log.info('Processed outbox events', total)
  } finally {
    await connection.disconnect()
  }
}

run().catch((err: Error) => {
  log.error('Outbox processing failed', { error: err.message, stack: err.stack })
  process.exitCode = 1
})
