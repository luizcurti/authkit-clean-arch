import { Controller } from '@/application/controllers'
import { HttpResponse, ok, serverError } from '@/application/helpers'
import { PgConnection } from '@/infra/repos/postgres/helpers/connection'
import { log } from '@/infra/logger'
import { AdvancedHealthCheckResponse, HealthStatus } from '@/application/dtos'

export class AdvancedHealthCheckController extends Controller<void> {
  constructor (
    private readonly pgConnection: PgConnection = PgConnection.getInstance()
  ) {
    super()
  }

  async perform (): Promise<HttpResponse<AdvancedHealthCheckResponse>> {
    try {
      // Verificação de database
      const dbCheck = await this.checkDatabase()
      
      // Verificação de memória
      const memoryCheck = this.checkMemory()
      
      // Sistema
      const systemInfo = this.getSystemInfo()
      
      // Status geral
      const overallStatus = this.calculateOverallStatus(dbCheck.status, memoryCheck.status)
      
      const response: AdvancedHealthCheckResponse = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        checks: {
          database: dbCheck,
          memory: memoryCheck,
          system: systemInfo
        }
      }

      // Log para monitoramento
      if (overallStatus !== 'healthy') {
        log.warn('Health check warning', { status: overallStatus, checks: response.checks })
      }
      
      return ok(response)
    } catch (error: any) {
      log.error('Health check failed', { error: error.message, stack: error.stack })
      return serverError(error)
    }
  }

  private async checkDatabase (): Promise<{ status: 'up' | 'down', responseTime?: number, error?: string }> {
    const start = Date.now()
    try {
      // Tenta executar uma query simples para verificar conectividade
      const repo = this.pgConnection.getRepository(Object)
      await repo.query('SELECT 1')
      return {
        status: 'up',
        responseTime: Date.now() - start
      }
    } catch (error: any) {
      return {
        status: 'down',
        error: error.message
      }
    }
  }

  private checkMemory (): { status: 'normal' | 'warning' | 'critical', used: number, total: number, percentage: number } {
    const memUsage = process.memoryUsage()
    const used = Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100
    const total = Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100
    const percentage = Math.round((used / total) * 100)
    
    let status: 'normal' | 'warning' | 'critical' = 'normal'
    if (percentage > 90) {
      status = 'critical'
    } else if (percentage > 75) {
      status = 'warning'
    }
    
    return { status, used, total, percentage }
  }

  private getSystemInfo (): { platform: string, nodeVersion: string, processId: number } {
    return {
      platform: process.platform,
      nodeVersion: process.version,
      processId: process.pid
    }
  }

  private calculateOverallStatus (dbStatus: 'up' | 'down', memoryStatus: 'normal' | 'warning' | 'critical'): HealthStatus {
    if (dbStatus === 'down') {
      return 'unhealthy'
    }
    
    if (memoryStatus === 'critical') {
      return 'degraded'
    }
    
    if (memoryStatus === 'warning') {
      return 'degraded'
    }
    
    return 'healthy'
  }
}
