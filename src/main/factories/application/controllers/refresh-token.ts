import { RefreshTokenController } from '@/application/controllers'
import { makeRefreshAccessToken } from '@/main/factories/domain/use-cases'

export const makeRefreshTokenController = (): RefreshTokenController => {
  return new RefreshTokenController(makeRefreshAccessToken())
}
