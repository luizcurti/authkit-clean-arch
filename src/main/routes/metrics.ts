import { Router } from 'express'
import { metricsRegistry } from '@/main/middlewares/metrics'

export default (router: Router): void => {
  router.get('/metrics', async (req, res) => {
    res.set('Content-Type', metricsRegistry.contentType)
    res.send(await metricsRegistry.metrics())
  })
}
