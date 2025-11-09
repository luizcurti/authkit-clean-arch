import { adaptExpressRoute } from '@/main/adapters'
import { makeHealthCheckController } from '@/main/factories/application/controllers'
import { Router } from 'express'

export default (router: Router): void => {
  router.get('/health', adaptExpressRoute(makeHealthCheckController()))
}