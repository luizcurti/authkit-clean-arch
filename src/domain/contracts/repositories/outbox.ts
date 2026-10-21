export namespace ClaimOutboxEvents {
  export type Input = {
    limit: number
    leaseInMs: number
    maxAttempts: number
  }

  // Handlers validate the payload
  export type Output = Array<{
    id: string
    type: string
    payload: unknown
    attempts: number
  }>
}

// Atomically claims up to `limit` pending, unleased events under `maxAttempts`, oldest first, leasing
// them for `leaseInMs` and counting the attempt
export interface ClaimOutboxEvents {
  claimOutboxEvents: (input: ClaimOutboxEvents.Input) => Promise<ClaimOutboxEvents.Output>
}

export namespace CompleteOutboxEvent {
  export type Input = { id: string }
}

export interface CompleteOutboxEvent {
  completeOutboxEvent: (input: CompleteOutboxEvent.Input) => Promise<void>
}

export namespace FailOutboxEvent {
  export type Input = { id: string, error: string }
}

// The event stays pending and is retried when its lease expires
export interface FailOutboxEvent {
  failOutboxEvent: (input: FailOutboxEvent.Input) => Promise<void>
}
