import express, { RequestHandler } from 'express'
import request from 'supertest'

// The limiters skip NODE_ENV=test, so they load in isolation as development
const loadLimiters = (vars: Record<string, string> = {}): { globalRateLimiter: RequestHandler, authRateLimiter: RequestHandler } => {
  const original = { ...process.env }
  Object.assign(process.env, { NODE_ENV: 'development', ...vars })
  let limiters!: { globalRateLimiter: RequestHandler, authRateLimiter: RequestHandler }
  jest.isolateModules(() => {
    limiters = require('@/main/middlewares/rate-limiter')
  })
  process.env = original
  return limiters
}

const makeApp = (limiter: RequestHandler) => express().get('/limited', limiter, (req, res) => { res.json({ ok: true }) })

describe('Rate limiters', () => {
  it('should allow 10 auth requests per minute per client and answer the 11th with a JSON 429', async () => {
    const app = makeApp(loadLimiters().authRateLimiter)

    for (let i = 0; i < 10; i++) {
      expect((await request(app).get('/limited')).status).toBe(200)
    }
    const { status, body, headers } = await request(app).get('/limited')

    expect(status).toBe(429)
    expect(body).toEqual({ error: 'Too many login attempts, please try again later' })
    expect(headers['ratelimit-limit']).toBe('10')
  })

  it('should include the request id in the 429 answer', async () => {
    const app = express()
      .use((req, res, next) => { req.locals = { requestId: 'any_request_id' }; next() })
      .get('/limited', loadLimiters().authRateLimiter, (req, res) => { res.json({ ok: true }) })

    for (let i = 0; i < 10; i++) await request(app).get('/limited')
    const { body } = await request(app).get('/limited')

    expect(body).toEqual({ error: 'Too many login attempts, please try again later', requestId: 'any_request_id' })
  })

  it('should allow 100 requests per minute per client globally', async () => {
    const app = makeApp(loadLimiters().globalRateLimiter)

    for (let i = 0; i < 100; i++) {
      await request(app).get('/limited')
    }
    const { status, body } = await request(app).get('/limited')

    expect(status).toBe(429)
    expect(body).toEqual({ error: 'Too many requests, please try again later' })
  })

  it('should take both limits from the environment', async () => {
    const { authRateLimiter, globalRateLimiter } = loadLimiters({ AUTH_RATE_LIMIT_PER_MINUTE: '2', RATE_LIMIT_PER_MINUTE: '3' })
    const authApp = makeApp(authRateLimiter)
    const globalApp = makeApp(globalRateLimiter)

    for (let i = 0; i < 2; i++) await request(authApp).get('/limited')
    for (let i = 0; i < 3; i++) await request(globalApp).get('/limited')

    expect((await request(authApp).get('/limited')).status).toBe(429)
    expect((await request(globalApp).get('/limited')).status).toBe(429)
  })
})
