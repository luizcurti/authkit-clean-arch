import { Hasher, TokenGenerator, UUIDGenerator } from '@/domain/contracts/gateways'
import { LoadRefreshTokenByHash, RevokeRefreshToken, RevokeRefreshTokenFamily, SaveRefreshToken } from '@/domain/contracts/repositories'
import { AuthenticationError } from '@/domain/entities/errors'
import { AccessToken, RefreshToken } from '@/domain/entities'

type Setup = (
  refreshTokenRepository: LoadRefreshTokenByHash & SaveRefreshToken & RevokeRefreshToken & RevokeRefreshTokenFamily,
  hasher: Hasher,
  tokenGenerator: TokenGenerator,
  idGenerator: UUIDGenerator
) => RefreshAccessToken

type Input = { refreshToken: string }
type Output = { accessToken: string, refreshToken: string }
export type RefreshAccessToken = (input: Input) => Promise<Output>

export const setupRefreshAccessToken: Setup = (refreshTokenRepository, hasher, tokenGenerator, idGenerator) => {
  return async ({ refreshToken }) => {
    const tokenHash = await hasher.hash(refreshToken)
    const stored = await refreshTokenRepository.loadByHash({ tokenHash })
    if (stored === undefined) {
      throw new AuthenticationError()
    }

    if (stored.revokedAt !== undefined) {
      // Reuse revokes the family, except within the grace window (a concurrent refresh, ADR-0013)
      const revokedForMs = Date.now() - stored.revokedAt.getTime()
      if (revokedForMs > RefreshToken.reuseGraceInMs) {
        await refreshTokenRepository.revokeRefreshTokenFamily({ familyId: stored.familyId })
      }
      throw new AuthenticationError()
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      throw new AuthenticationError()
    }

    // A concurrent rotation of the same token won: issue no second pair
    const revoked = await refreshTokenRepository.revokeRefreshToken({ id: stored.id })
    if (!revoked) {
      throw new AuthenticationError()
    }

    const newRefreshToken = idGenerator.uuid({ key: 'rt' })
    const newTokenHash = await hasher.hash(newRefreshToken)
    await refreshTokenRepository.saveRefreshToken({
      userId: stored.userId,
      tokenHash: newTokenHash,
      expiresAt: new Date(Date.now() + RefreshToken.expirationInMs),
      familyId: stored.familyId
    })

    const accessToken = await tokenGenerator.generate({
      key: stored.userId,
      expirationInMs: AccessToken.expirationInMs
    })

    return { accessToken, refreshToken: newRefreshToken }
  }
}
