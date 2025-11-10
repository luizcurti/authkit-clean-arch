import { Controller } from '@/application/controllers'
import { HttpResponse, ok } from '@/application/helpers'
import { HealthCheckResponse } from '@/application/dtos'

export class HealthCheckController extends Controller<void> {
  async perform (): Promise<HttpResponse<HealthCheckResponse>> {
    return ok({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
      }
    })
  }
}