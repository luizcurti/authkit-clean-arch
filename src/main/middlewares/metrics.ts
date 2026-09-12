import { Request, Response, NextFunction } from 'express'
import client from 'prom-client'

export const metricsRegistry = new client.Registry()
client.collectDefaultMetrics({ register: metricsRegistry })

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [metricsRegistry]
})

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [metricsRegistry]
})

export const requestMetrics = (req: Request, res: Response, next: NextFunction): void => {
  const startedAt = process.hrtime.bigint()

  res.on('finish', () => {
    const durationInSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9
    const route = req.route?.path !== undefined ? `${req.baseUrl}${req.route.path}` : req.path
    const labels = { method: req.method, route, status_code: String(res.statusCode) }

    httpRequestDuration.observe(labels, durationInSeconds)
    httpRequestsTotal.inc(labels)
  })

  next()
}
