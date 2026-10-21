import { ClaimOutboxEvents, CompleteOutboxEvent, FailOutboxEvent } from '@/domain/contracts/repositories'
import { PgOutboxEvent } from '@/infra/repos/postgres/entities'
import { PgRepository } from '@/infra/repos/postgres/repository'

type ClaimInput = ClaimOutboxEvents.Input
type ClaimOutput = ClaimOutboxEvents.Output
type CompleteInput = CompleteOutboxEvent.Input
type FailInput = FailOutboxEvent.Input

type ClaimedRow = { id: number, type: string, payload: unknown, attempts: number }

const MAX_ERROR_LENGTH = 1000

export class PgOutboxRepository extends PgRepository implements ClaimOutboxEvents, CompleteOutboxEvent, FailOutboxEvent {
  // SKIP LOCKED gives concurrent workers disjoint batches; the lease uses the database clock.
  // pg-mem has no SKIP LOCKED: covered by tests/postgres/outbox.pg.test.ts
  /* c8 ignore start */
  async claimOutboxEvents ({ limit, leaseInMs, maxAttempts }: ClaimInput): Promise<ClaimOutput> {
    const raw: unknown = await this.getRepository(PgOutboxEvent).query(
      `UPDATE "outbox_events"
          SET "locked_until" = now() + ($2::int * interval '1 millisecond'),
              "attempts" = "attempts" + 1
        WHERE "id" IN (
          SELECT "id" FROM "outbox_events"
           WHERE "processed_at" IS NULL
             AND "attempts" < $3
             AND ("locked_until" IS NULL OR "locked_until" < now())
           ORDER BY "id"
           LIMIT $1
           FOR UPDATE SKIP LOCKED)
        RETURNING "id", "type", "payload", "attempts"`,
      [limit, leaseInMs, maxAttempts]
    )
    // The postgres driver returns [rows, affectedCount] for an UPDATE
    const rows = (Array.isArray(raw) && Array.isArray(raw[0]) ? raw[0] : raw) as ClaimedRow[]
    return rows
      .sort((a, b) => a.id - b.id)
      .map(({ id, type, payload, attempts }) => ({ id: id.toString(), type, payload, attempts }))
  }
  /* c8 ignore stop */

  async completeOutboxEvent ({ id }: CompleteInput): Promise<void> {
    await this.getRepository(PgOutboxEvent).update({ id: parseInt(id) }, { processedAt: new Date(), lockedUntil: null })
  }

  // The lease stays: it is the retry delay
  async failOutboxEvent ({ id, error }: FailInput): Promise<void> {
    await this.getRepository(PgOutboxEvent).update({ id: parseInt(id) }, { lastError: error.slice(0, MAX_ERROR_LENGTH) })
  }
}
