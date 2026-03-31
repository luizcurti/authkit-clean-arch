import request from 'supertest'
import { IBackup } from 'pg-mem'
import { PgConnection } from '@/infra/repos/postgres/helpers'
import { makeFakeDb } from '@/tests/infra/repos/mocks'
import { app, ready } from '@/main/config/app'

describe('Health Routes', () => {
  let pgBackup: IBackup
  let connection: PgConnection

  beforeAll(async () => {
    await ready
    connection = PgConnection.getInstance()
    const db = await makeFakeDb()
    pgBackup = db.backup()
  })

  afterAll(async () => {
    await connection.disconnect()
  })

  beforeEach(() => {
    pgBackup.restore()
  })

  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const { status, body } = await request(app).get('/api/health')

      expect(status).toBe(200)
      expect(body.status).toBe('ok')
    })

    it('should return timestamp in ISO format', async () => {
      const { body } = await request(app).get('/api/health')

      expect(body.timestamp).toBeDefined()
      expect(() => new Date(body.timestamp)).not.toThrow()
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
    })

    it('should return uptime as a positive number', async () => {
      const { body } = await request(app).get('/api/health')

      expect(typeof body.uptime).toBe('number')
      expect(body.uptime).toBeGreaterThan(0)
    })

    it('should return memory usage info', async () => {
      const { body } = await request(app).get('/api/health')

      expect(body.memory).toBeDefined()
      expect(typeof body.memory.used).toBe('number')
      expect(typeof body.memory.total).toBe('number')
      expect(body.memory.used).toBeGreaterThan(0)
      expect(body.memory.total).toBeGreaterThan(0)
    })

    it('should return environment and version', async () => {
      const { body } = await request(app).get('/api/health')

      expect(body.environment).toBeDefined()
      expect(body.version).toBeDefined()
    })
  })

  describe('GET /health/detailed', () => {
    it('should return 200 with a status field', async () => {
      const { status, body } = await request(app).get('/api/health/detailed')

      expect(status).toBe(200)
      expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status)
    })

    it('should return checks object with database, memory and system', async () => {
      const { body } = await request(app).get('/api/health/detailed')

      expect(body.checks).toBeDefined()
      expect(body.checks.database).toBeDefined()
      expect(body.checks.memory).toBeDefined()
      expect(body.checks.system).toBeDefined()
    })

    it('should return valid database check shape', async () => {
      const { body } = await request(app).get('/api/health/detailed')

      expect(['up', 'down']).toContain(body.checks.database.status)
    })

    it('should return valid memory check shape', async () => {
      const { body } = await request(app).get('/api/health/detailed')

      const { memory } = body.checks
      expect(['normal', 'warning', 'critical']).toContain(memory.status)
      expect(typeof memory.used).toBe('number')
      expect(typeof memory.total).toBe('number')
      expect(typeof memory.percentage).toBe('number')
      expect(memory.percentage).toBeGreaterThanOrEqual(0)
      expect(memory.percentage).toBeLessThanOrEqual(100)
    })

    it('should return valid system check shape', async () => {
      const { body } = await request(app).get('/api/health/detailed')

      const { system } = body.checks
      expect(typeof system.platform).toBe('string')
      expect(typeof system.nodeVersion).toBe('string')
      expect(typeof system.processId).toBe('number')
    })

    it('should return timestamp in ISO format', async () => {
      const { body } = await request(app).get('/api/health/detailed')

      expect(body.timestamp).toBeDefined()
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp)
    })

    it('should return uptime as integer', async () => {
      const { body } = await request(app).get('/api/health/detailed')

      expect(Number.isInteger(body.uptime)).toBe(true)
    })
  })
})
