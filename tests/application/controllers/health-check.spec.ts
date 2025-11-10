import { HealthCheckController } from '@/application/controllers'

describe('HealthCheckController', () => {
  let sut: HealthCheckController

  beforeEach(() => {
    sut = new HealthCheckController()
  })

  it('should return 200 with health status', async () => {
    const result = await sut.handle(undefined)

    expect(result.statusCode).toBe(200)
    expect(result.data).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      environment: expect.any(String),
      version: expect.any(String),
      memory: {
        used: expect.any(Number),
        total: expect.any(Number)
      }
    })
  })

  it('should call perform method directly', async () => {
    const result = await sut.perform()

    expect(result.statusCode).toBe(200)
    expect(result.data).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      environment: expect.any(String),
      version: expect.any(String),
      memory: {
        used: expect.any(Number),
        total: expect.any(Number)
      }
    })
  })

  it('should return development environment when NODE_ENV is undefined', async () => {
    const originalEnv = process.env.NODE_ENV
    const originalVersion = process.env.npm_package_version
    delete process.env.NODE_ENV
    delete process.env.npm_package_version

    const result = await sut.perform()

    expect(result.data.environment).toBe('development')
    expect(result.data.version).toBe('1.0.0')

    // Restore environment
    if (originalEnv !== undefined) process.env.NODE_ENV = originalEnv
    if (originalVersion !== undefined) process.env.npm_package_version = originalVersion
  })

  it('should return current environment when NODE_ENV is set', async () => {
    const originalEnv = process.env.NODE_ENV
    const originalVersion = process.env.npm_package_version
    process.env.NODE_ENV = 'test'
    process.env.npm_package_version = '2.0.0'

    const result = await sut.perform()

    expect(result.data.environment).toBe('test')
    expect(result.data.version).toBe('2.0.0')

    // Restore environment
    if (originalEnv !== undefined) process.env.NODE_ENV = originalEnv
    if (originalVersion !== undefined) process.env.npm_package_version = originalVersion
  })
})