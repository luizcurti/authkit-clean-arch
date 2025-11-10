import { adaptExpressRoute } from '@/main/adapters'
import { makeHealthCheckController, makeAdvancedHealthCheckController } from '@/main/factories/application/controllers'
import { Router } from 'express'

export default (router: Router): void => {
  // Basic health check (fast)
  router.get('/health', adaptExpressRoute(makeHealthCheckController()))
  
  // Advanced health check with detailed verification
  router.get('/health/detailed', adaptExpressRoute(makeAdvancedHealthCheckController()))
}
