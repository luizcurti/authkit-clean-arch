import { adaptExpressRoute } from '@/main/adapters'
import { makeHealthCheckController, makeAdvancedHealthCheckController } from '@/main/factories/application/controllers'
import { Router } from 'express'

export default (router: Router): void => {
  // Health check básico (rápido)
  router.get('/health', adaptExpressRoute(makeHealthCheckController()))
  
  // Health check avançado com verificações detalhadas
  router.get('/health/detailed', adaptExpressRoute(makeAdvancedHealthCheckController()))
}
