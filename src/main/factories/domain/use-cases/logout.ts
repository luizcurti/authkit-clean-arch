import { Logout, setupLogout } from '@/domain/use-cases'
import { makeCryptoHasher } from '@/main/factories/infra/gateways'
import { makePgRefreshTokenRepository } from '@/main/factories/infra/repos/postgres'

export const makeLogout = (): Logout => {
  return setupLogout(makePgRefreshTokenRepository(), makeCryptoHasher())
}
