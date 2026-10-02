import { LogoutController } from '@/application/controllers'
import { makeLogout } from '@/main/factories/domain/use-cases'

export const makeLogoutController = (): LogoutController => {
  return new LogoutController(makeLogout())
}
