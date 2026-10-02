import { ProcessOutboxEvents, setupProcessOutboxEvents } from '@/domain/use-cases'
import { makeAwsS3FileStorage } from '@/main/factories/infra/gateways'
import { makePgOutboxRepository } from '@/main/factories/infra/repos/postgres'

export const makeProcessOutboxEvents = (): ProcessOutboxEvents => {
  return setupProcessOutboxEvents(makePgOutboxRepository(), makeAwsS3FileStorage())
}
