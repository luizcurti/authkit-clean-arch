import { adaptExpressRoute } from '@/main/adapters'
import { makeHealthCheckController, makeAdvancedHealthCheckController } from '@/main/factories/application/controllers'
import { Router } from 'express'
import { opsAuth } from '@/main/middlewares'

export default (router: Router): void => {
  router.get('/health', adaptExpressRoute(makeHealthCheckController()))

  router.get('/health/detailed', opsAuth, adaptExpressRoute(makeAdvancedHealthCheckController()))
}
