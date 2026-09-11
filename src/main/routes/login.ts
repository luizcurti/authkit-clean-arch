import { Router } from 'express'
import { makeFacebookLoginController, makeRefreshTokenController } from '@/main/factories/application/controllers'
import { adaptExpressRoute as adapt } from '@/main/adapters'
import { authRateLimiter } from '@/main/middlewares'

export default (router: Router): void => {
  router.post('/login/facebook', authRateLimiter, adapt(makeFacebookLoginController()))
  router.post('/login/refresh', authRateLimiter, adapt(makeRefreshTokenController()))
}
