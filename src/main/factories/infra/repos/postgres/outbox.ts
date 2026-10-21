import { PgOutboxRepository } from '@/infra/repos/postgres'

export const makePgOutboxRepository = (): PgOutboxRepository => {
  return new PgOutboxRepository()
}
