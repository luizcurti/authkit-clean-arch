import { PgRefreshTokenRepository } from '@/infra/repos/postgres'

export const makePgRefreshTokenRepository = (): PgRefreshTokenRepository => {
  return new PgRefreshTokenRepository()
}
