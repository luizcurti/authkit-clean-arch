import express, { Express } from 'express'
import request from 'supertest'

type CorsEnv = { corsAllowedOrigins: string[], isProduction: boolean }

// The CORS policy comes from env, so each case loads it in isolation
const makeApp = ({ corsAllowedOrigins, isProduction }: CorsEnv): { app: Express, warn: jest.Mock } => {
  const warn = jest.fn()
  const app = express()
  jest.isolateModules(() => {
    jest.doMock('@/main/config/env', () => ({
      env: { corsAllowedOrigins, isProduction, isTest: true, trustProxyHops: 0 }
    }))
    jest.doMock('@/infra/logger', () => ({ log: { warn, http: jest.fn(), error: jest.fn() } }))
    require('@/main/config/middlewares').setupMiddlewares(app)
  })
  app.get('/api/any', (req, res) => { res.send({ ok: true }) })
  return { app, warn }
}

describe('setupMiddlewares', () => {
  describe('CORS', () => {
    it('should allow only the configured origins', async () => {
      const { app } = makeApp({ corsAllowedOrigins: ['https://allowed.com'], isProduction: true })

      const allowed = await request(app).get('/api/any').set('Origin', 'https://allowed.com')
      const other = await request(app).get('/api/any').set('Origin', 'https://other.com')

      expect(allowed.headers['access-control-allow-origin']).toBe('https://allowed.com')
      expect(other.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('should deny every cross-origin request in production without an allowlist, and warn', async () => {
      const { app, warn } = makeApp({ corsAllowedOrigins: [], isProduction: true })

      const { headers } = await request(app).get('/api/any').set('Origin', 'https://any.com')

      expect(headers['access-control-allow-origin']).toBeUndefined()
      expect(warn).toHaveBeenCalledWith('CORS_ALLOWED_ORIGINS is not set in production - denying all cross-origin requests')
    })

    it('should reflect any origin outside production without an allowlist', async () => {
      const { app, warn } = makeApp({ corsAllowedOrigins: [], isProduction: false })

      const { headers } = await request(app).get('/api/any').set('Origin', 'https://any.com')

      expect(headers['access-control-allow-origin']).toBe('https://any.com')
      expect(warn).not.toHaveBeenCalled()
    })

    it('should answer a preflight request', async () => {
      const { app } = makeApp({ corsAllowedOrigins: ['https://allowed.com'], isProduction: true })

      const { status, headers } = await request(app)
        .options('/api/any')
        .set('Origin', 'https://allowed.com')
        .set('Access-Control-Request-Method', 'PUT')

      expect(status).toBe(204)
      expect(headers['access-control-allow-methods']).toContain('PUT')
    })
  })

  it('should send the request id, security headers and a JSON content type on API routes', async () => {
    const { app } = makeApp({ corsAllowedOrigins: [], isProduction: false })

    const { headers } = await request(app).get('/api/any').set('X-Request-Id', 'any_request_id')

    expect(headers['x-request-id']).toBe('any_request_id')
    expect(headers['x-content-type-options']).toBe('nosniff')
    expect(headers['content-type']).toContain('application/json')
  })
})
