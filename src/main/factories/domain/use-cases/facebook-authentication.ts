import { FacebookAuthentication, setupFacebookAuthentication } from '@/domain/use-cases'
import { makeFacebookApi, makeJwtTokenHandler, makeCryptoHasher, makeUuidHandler } from '@/main/factories/infra/gateways'
import { makePgUserAccountRepository, makePgRefreshTokenRepository } from '@/main/factories/infra/repos/postgres'

export const makeFacebookAuthentication = (): FacebookAuthentication => {
  const jwtTokenGenerator = makeJwtTokenHandler()
  const pgUserAccountRepo = makePgUserAccountRepository()
  const pgRefreshTokenRepo = makePgRefreshTokenRepository()
  const fbApi = makeFacebookApi()
  const hasher = makeCryptoHasher()
  const idGenerator = makeUuidHandler()
  return setupFacebookAuthentication(
    fbApi,
    pgUserAccountRepo,
    pgRefreshTokenRepo,
    jwtTokenGenerator,
    hasher,
    idGenerator
  )
}
