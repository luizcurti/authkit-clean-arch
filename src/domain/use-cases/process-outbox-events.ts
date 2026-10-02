import { DeleteFile } from '@/domain/contracts/gateways'
import { ClaimOutboxEvents, CompleteOutboxEvent, FailOutboxEvent } from '@/domain/contracts/repositories'
import { Outbox } from '@/domain/entities'

type Setup = (
  outboxRepository: ClaimOutboxEvents & CompleteOutboxEvent & FailOutboxEvent,
  fileStorage: DeleteFile
) => ProcessOutboxEvents

type Output = { processed: number, failed: number }
export type ProcessOutboxEvents = () => Promise<Output>

type ClaimedEvent = ClaimOutboxEvents.Output[number]

// Processes one batch. A failing event is recorded and the batch goes on
export const setupProcessOutboxEvents: Setup = (outboxRepository, fileStorage) => {
  // Handlers are idempotent: delivery is at-least-once
  const handle = async ({ type, payload }: ClaimedEvent): Promise<void> => {
    switch (type) {
      case 'ProfilePictureReplaced': {
        const pictureKey = (payload as { pictureKey?: unknown } | null)?.pictureKey
        if (typeof pictureKey !== 'string' || pictureKey.length === 0) {
          throw new Error('Invalid ProfilePictureReplaced payload: pictureKey is missing')
        }
        // Deleting a missing key succeeds
        await fileStorage.delete({ fileName: pictureKey })
        return
      }
      default:
        throw new Error(`No handler for outbox event type "${type}"`)
    }
  }

  return async () => {
    const events = await outboxRepository.claimOutboxEvents({
      limit: Outbox.batchSize,
      leaseInMs: Outbox.leaseInMs,
      maxAttempts: Outbox.maxAttempts
    })
    let processed = 0
    let failed = 0
    for (const event of events) {
      try {
        await handle(event)
      } catch (error) {
        await outboxRepository.failOutboxEvent({ id: event.id, error: error instanceof Error ? error.message : String(error) })
        failed++
        continue
      }
      await outboxRepository.completeOutboxEvent({ id: event.id })
      processed++
    }
    return { processed, failed }
  }
}
