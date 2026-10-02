import { DeleteExpiredRefreshTokens } from '@/domain/contracts/repositories'

type Setup = (refreshTokenRepository: DeleteExpiredRefreshTokens) => PurgeExpiredRefreshTokens

type Output = { deleted: number }
export type PurgeExpiredRefreshTokens = () => Promise<Output>

export const setupPurgeExpiredRefreshTokens: Setup = (refreshTokenRepository) => {
  return async () => {
    const deleted = await refreshTokenRepository.deleteExpiredRefreshTokens({ expiredBefore: new Date() })
    return { deleted }
  }
}
