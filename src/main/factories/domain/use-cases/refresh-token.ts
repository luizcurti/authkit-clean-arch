import { RefreshAccessToken, setupRefreshAccessToken } from '@/domain/use-cases'
import { makeJwtTokenHandler, makeCryptoHasher, makeUuidHandler } from '@/main/factories/infra/gateways'
import { makePgRefreshTokenRepository } from '@/main/factories/infra/repos/postgres'

export const makeRefreshAccessToken = (): RefreshAccessToken => {
  const jwtTokenGenerator = makeJwtTokenHandler()
  const pgRefreshTokenRepo = makePgRefreshTokenRepository()
  const hasher = makeCryptoHasher()
  const idGenerator = makeUuidHandler()
  return setupRefreshAccessToken(pgRefreshTokenRepo, hasher, jwtTokenGenerator, idGenerator)
}
