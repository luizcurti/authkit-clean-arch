import request from 'supertest'
import { IBackup } from 'pg-mem'
import { PgConnection } from '@/infra/repos/postgres/helpers'
import { makeFakeDb } from '@/tests/infra/repos/mocks'
import { app, ready } from '@/main/config/app'

describe('Metrics Routes', () => {
  let pgBackup: IBackup
  let connection: PgConnection

  beforeAll(async () => {
    await ready
    connection = PgConnection.getInstance()
    const db = await makeFakeDb()
    pgBackup = db.backup()
  })

  afterAll(async () => {
    if (connection !== undefined) await connection.disconnect()
  })

  beforeEach(() => {
    pgBackup.restore()
  })

  describe('GET /metrics', () => {
    it('should return 200 with Prometheus-format metrics', async () => {
      await request(app).get('/api/health')

      const { status, headers, text } = await request(app).get('/api/metrics')

      expect(status).toBe(200)
      expect(headers['content-type']).toContain('text/plain')
      expect(text).toContain('http_requests_total')
      expect(text).toContain('http_request_duration_seconds')
    })
  })
})
