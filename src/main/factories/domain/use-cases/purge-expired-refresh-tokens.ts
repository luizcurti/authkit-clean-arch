import { PurgeExpiredRefreshTokens, setupPurgeExpiredRefreshTokens } from '@/domain/use-cases'
import { makePgRefreshTokenRepository } from '@/main/factories/infra/repos/postgres'

export const makePurgeExpiredRefreshTokens = (): PurgeExpiredRefreshTokens => {
  return setupPurgeExpiredRefreshTokens(makePgRefreshTokenRepository())
}
