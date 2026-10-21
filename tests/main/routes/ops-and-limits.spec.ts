import request from 'supertest'
import { Express } from 'express'

// These settings are read on load, so each case loads the app in isolation
const PRODUCTION_SECRETS = {
  FB_CLIENT_ID: 'fb_id',
  FB_CLIENT_SECRET: 'fb_secret',
  JWT_SECRET: 'j'.repeat(32),
  S3_ACCESS_KEY_ID: 's3_key',
  S3_SECRET_ACCESS_KEY: 's3_secret',
  S3_BUCKET: 'bucket'
}

const loadApp = async (vars: Record<string, string>): Promise<Express> => {
  const original = { ...process.env }
  Object.assign(process.env, vars)
  let app!: Express
  await jest.isolateModulesAsync(async () => {
    jest.doMock('@/infra/logger', () => ({ log: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), http: jest.fn(), debug: jest.fn() } }))
    const config = require('@/main/config/app')
    await config.ready
    app = config.app
  })
  process.env = original
  return app
}

const opsToken = 'ops_token_with_more_than_16_chars'

describe.each(['/api/metrics', '/api/health/detailed'])('%s', (path) => {
  describe('with OPS_TOKEN configured', () => {
    let app: Express

    beforeAll(async () => {
      app = await loadApp({ OPS_TOKEN: opsToken })
    })

    it('should answer 200 to the configured Bearer token', async () => {
      const { status } = await request(app).get(path).set('Authorization', `Bearer ${opsToken}`)

      expect(status).toBe(200)
    })

    it.each([
      ['no Authorization header', undefined],
      ['a wrong token', 'Bearer wrong_token_wrong_token'],
      ['the token without the Bearer scheme', opsToken],
      ['a user access token', 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.x']
    ])('should answer 401 to %s', async (_, authorization) => {
      const req = request(app).get(path)
      const { status, body } = await (authorization === undefined ? req : req.set('Authorization', authorization))

      expect(status).toBe(401)
      expect(body).toEqual({ error: 'unauthorized', requestId: expect.any(String) })
    })
  })

  describe('in production without OPS_TOKEN', () => {
    it('should hide the endpoint with a 404, whatever the token', async () => {
      const app = await loadApp({ NODE_ENV: 'production', ...PRODUCTION_SECRETS })

      const { status, body } = await request(app).get(path).set('Authorization', `Bearer ${opsToken}`)

      expect(status).toBe(404)
      expect(body).toEqual({ error: 'Not found', requestId: expect.any(String) })
    })
  })
})

describe('in production', () => {
  it('should not serve the API docs by default', async () => {
    const app = await loadApp({ NODE_ENV: 'production', ...PRODUCTION_SECRETS })

    const { status } = await request(app).get('/api-docs/')

    expect(status).toBe(404)
  })
})

describe('rate limits (active outside NODE_ENV=test)', () => {
  it('should share 10 requests per minute between login, refresh and logout, answering the 11th with 429', async () => {
    const app = await loadApp({ NODE_ENV: 'development' })

    for (let i = 0; i < 10; i++) {
      const { status } = await request(app).post('/api/login/facebook').send({})
      expect(status).toBe(400)
    }
    // Limited before the controller: the counter is shared
    const refresh = await request(app).post('/api/login/refresh').send({})
    const { status, headers, body } = await request(app).post('/api/logout').send({})

    expect(refresh.status).toBe(429)
    expect(status).toBe(429)
    expect(headers['ratelimit-limit']).toBe('10')
    expect(headers['retry-after']).toEqual(expect.any(String))
    expect(body).toEqual({ error: 'Too many login attempts, please try again later', requestId: expect.any(String) })
  })

  it('should not count other routes against the login limit', async () => {
    const app = await loadApp({ NODE_ENV: 'development' })

    for (let i = 0; i < 15; i++) await request(app).get('/api/health')
    const { status } = await request(app).post('/api/login/facebook').send({})

    expect(status).toBe(400)
  })

  it('should answer the 101st request of a minute to any route with 429', async () => {
    const app = await loadApp({ NODE_ENV: 'development' })

    for (let i = 0; i < 100; i++) await request(app).get('/api/health')
    const { status, body } = await request(app).get('/api/health')

    expect(status).toBe(429)
    expect(body).toEqual({ error: 'Too many requests, please try again later', requestId: expect.any(String) })
  })
})
