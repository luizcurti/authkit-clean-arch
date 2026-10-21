// Side effects recorded in the transaction of the change that causes them, run by a worker (ADR-0016)
export const Outbox = {
  batchSize: 20,
  // How long a claimed event is hidden from other workers
  leaseInMs: 60 * 1000,
  // Then the event stays unprocessed for inspection
  maxAttempts: 5
}

export type ProfilePictureReplaced = {
  type: 'ProfilePictureReplaced'
  payload: { pictureKey: string }
}
