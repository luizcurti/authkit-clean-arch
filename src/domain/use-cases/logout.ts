import { Hasher } from '@/domain/contracts/gateways'
import { LoadRefreshTokenByHash, RevokeRefreshTokenFamily } from '@/domain/contracts/repositories'

type Setup = (
  refreshTokenRepository: LoadRefreshTokenByHash & RevokeRefreshTokenFamily,
  hasher: Hasher
) => Logout

type Input = { refreshToken: string }
export type Logout = (input: Input) => Promise<void>

// Revokes the token's family. Silent on unknown tokens
export const setupLogout: Setup = (refreshTokenRepository, hasher) => {
  return async ({ refreshToken }) => {
    const tokenHash = await hasher.hash(refreshToken)
    const stored = await refreshTokenRepository.loadByHash({ tokenHash })
    if (stored !== undefined) {
      await refreshTokenRepository.revokeRefreshTokenFamily({ familyId: stored.familyId })
    }
  }
}
