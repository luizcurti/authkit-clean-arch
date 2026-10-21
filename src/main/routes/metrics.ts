import { Router } from 'express'
import { metricsRegistry } from '@/main/middlewares/metrics'
import { opsAuth } from '@/main/middlewares'

export default (router: Router): void => {
  router.get('/metrics', opsAuth, async (req, res) => {
    res.set('Content-Type', metricsRegistry.contentType)
    res.send(await metricsRegistry.metrics())
  })
}
