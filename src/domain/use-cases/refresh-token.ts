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
      // Reuse of an already-rotated refresh token: treat as a compromised family and revoke it entirely
      await refreshTokenRepository.revokeRefreshTokenFamily({ familyId: stored.familyId })
      throw new AuthenticationError()
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      throw new AuthenticationError()
    }

    await refreshTokenRepository.revokeRefreshToken({ id: stored.id })

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
