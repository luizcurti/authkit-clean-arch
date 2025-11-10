import { AdvancedHealthCheckController } from '@/application/controllers/advanced-health-check'
import { PgConnection } from '@/infra/repos/postgres/helpers/connection'
import { log } from '@/infra/logger'

jest.mock('@/infra/logger', () => ({
  log: {
    warn: jest.fn(),
    error: jest.fn()
  }
}))

describe('AdvancedHealthCheckController', () => {
  let sut: AdvancedHealthCheckController
  let pgConnection: jest.Mocked<PgConnection>

  beforeEach(() => {
    pgConnection = {
      getRepository: jest.fn().mockReturnValue({
        query: jest.fn()
      })
    } as any
    sut = new AdvancedHealthCheckController(pgConnection)
    jest.clearAllMocks()
  })

  it('should return 200 with healthy status when all checks pass', async () => {
    const mockQuery = jest.fn().mockResolvedValue([{ '?column?': 1 }])
    pgConnection.getRepository = jest.fn().mockReturnValue({ query: mockQuery })

    const originalMemoryUsage = process.memoryUsage
    process.memoryUsage = jest.fn(() => ({
      heapUsed: 50 * 1024 * 1024, // 50MB used
      heapTotal: 100 * 1024 * 1024, // 100MB total (50% usage)
      external: 0,
      rss: 0,
      arrayBuffers: 0
    })) as any

    const result = await sut.perform()

    expect(result.statusCode).toBe(200)
    expect(result.data.status).toBe('healthy')
    expect(result.data.checks.database.status).toBe('up')
    expect(result.data.checks.database.responseTime).toBeDefined()
    expect(result.data.checks.memory.status).toBe('normal')
    expect(result.data.checks.system.platform).toBeDefined()
    expect(result.data.checks.system.nodeVersion).toBeDefined()
    expect(result.data.checks.system.processId).toBeDefined()

    process.memoryUsage = originalMemoryUsage
  })

  it('should return degraded status when memory usage is high', async () => {
    const mockQuery = jest.fn().mockResolvedValue([{ '?column?': 1 }])
    pgConnection.getRepository = jest.fn().mockReturnValue({ query: mockQuery })

  // Mock memory to simulate high usage
    const originalMemoryUsage = process.memoryUsage
    process.memoryUsage = jest.fn(() => ({
      heapUsed: 80 * 1024 * 1024, // 80MB used
      heapTotal: 100 * 1024 * 1024, // 100MB total (80% usage)
      external: 0,
      rss: 0,
      arrayBuffers: 0
    })) as any

    const result = await sut.perform()

    expect(result.statusCode).toBe(200)
    expect(result.data.status).toBe('degraded')
    expect(result.data.checks.memory.status).toBe('warning')
    expect(log.warn).toHaveBeenCalledWith('Health check warning', expect.any(Object))

    process.memoryUsage = originalMemoryUsage
  })

  it('should return unhealthy status when database is down', async () => {
    const mockQuery = jest.fn().mockRejectedValue(new Error('Connection refused'))
    pgConnection.getRepository = jest.fn().mockReturnValue({ query: mockQuery })

    const result = await sut.perform()

    expect(result.statusCode).toBe(200)
    expect(result.data.status).toBe('unhealthy')
    expect(result.data.checks.database.status).toBe('down')
    expect(result.data.checks.database.error).toBe('Connection refused')
    expect(log.warn).toHaveBeenCalledWith('Health check warning', expect.any(Object))
  })

  it('should return degraded status when memory is critical', async () => {
    const mockQuery = jest.fn().mockResolvedValue([{ '?column?': 1 }])
    pgConnection.getRepository = jest.fn().mockReturnValue({ query: mockQuery })

    const originalMemoryUsage = process.memoryUsage
    process.memoryUsage = jest.fn(() => ({
      heapUsed: 95 * 1024 * 1024, // 95MB used
      heapTotal: 100 * 1024 * 1024, // 100MB total (95% usage)
      external: 0,
      rss: 0,
      arrayBuffers: 0
    })) as any

    const result = await sut.perform()

    expect(result.statusCode).toBe(200)
    expect(result.data.status).toBe('degraded')
    expect(result.data.checks.memory.status).toBe('critical')
    expect(log.warn).toHaveBeenCalled()

    process.memoryUsage = originalMemoryUsage
  })

  it('should handle database timeout gracefully', async () => {
    const mockQuery = jest.fn().mockRejectedValue(new Error('Query timeout'))
    pgConnection.getRepository = jest.fn().mockReturnValue({ query: mockQuery })

    const result = await sut.perform()

    expect(result.statusCode).toBe(200)
    expect(result.data.status).toBe('unhealthy')
    expect(result.data.checks.database.status).toBe('down')
    expect(result.data.checks.database.error).toBe('Query timeout')
  })

  it('should return 500 when an unexpected error occurs', async () => {
    const unexpectedError = new Error('Unexpected error')
    
  // Spy on checkDatabase method and force it to throw an exception
    jest.spyOn(sut as any, 'checkDatabase').mockRejectedValue(unexpectedError)

    const result = await sut.perform()

    expect(result.statusCode).toBe(500)
    expect(result.data).toBeInstanceOf(Error)
    expect((result.data as any).message).toBe('Server failed. Try again later')
    expect(log.error).toHaveBeenCalledWith('Health check failed', {
      error: unexpectedError.message,
      stack: unexpectedError.stack
    })
  })

  it('should use default values when NODE_ENV is not set', async () => {
    const mockQuery = jest.fn().mockResolvedValue([{ '?column?': 1 }])
    pgConnection.getRepository = jest.fn().mockReturnValue({ query: mockQuery })

    const originalNodeEnv = process.env.NODE_ENV
    delete process.env.NODE_ENV

    const result = await sut.perform()

    expect(result.statusCode).toBe(200)
    expect(result.data.environment).toBe('development')

    process.env.NODE_ENV = originalNodeEnv
  })

  it('should use default values when npm_package_version is not set', async () => {
    const mockQuery = jest.fn().mockResolvedValue([{ '?column?': 1 }])
    pgConnection.getRepository = jest.fn().mockReturnValue({ query: mockQuery })

    const originalVersion = process.env.npm_package_version
    delete process.env.npm_package_version

    const result = await sut.perform()

    expect(result.statusCode).toBe(200)
    expect(result.data.version).toBe('1.0.0')

    process.env.npm_package_version = originalVersion
  })
})
