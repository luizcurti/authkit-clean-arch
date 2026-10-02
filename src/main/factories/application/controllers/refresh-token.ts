import { Controller, RefreshTokenController } from '@/application/controllers'
import { makePgTransactionController } from '@/main/factories/application/decorators'
import { makeRefreshAccessToken } from '@/main/factories/domain/use-cases'

// Revoking the old token and saving the new one are atomic
export const makeRefreshTokenController = (): Controller => {
  return makePgTransactionController(new RefreshTokenController(makeRefreshAccessToken()))
}
