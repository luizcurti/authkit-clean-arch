import request from 'supertest'
import { app, ready } from '@/main/config/app'

describe('App', () => {
  beforeAll(async () => {
    await ready
  })

  it('should answer unknown /api routes with a JSON 404', async () => {
    const { status, headers, body } = await request(app).get('/api/this-route-does-not-exist')

    expect(status).toBe(404)
    expect(headers['content-type']).toContain('application/json')
    expect(body).toEqual({ error: 'Not found', requestId: expect.any(String) })
  })

  it('should send the default Content-Security-Policy on API routes', async () => {
    const { headers } = await request(app).get('/api/this-route-does-not-exist')

    expect(headers['content-security-policy']).toContain("script-src 'self'")
  })

  it('should serve the Swagger UI as HTML under the same Content-Security-Policy', async () => {
    const { status, headers } = await request(app).get('/api-docs/')

    expect(status).toBe(200)
    expect(headers['content-type']).toContain('text/html')
    expect(headers['content-security-policy']).toContain("script-src 'self'")
  })

  it('should answer a malformed JSON body with a JSON 400 instead of an HTML error page', async () => {
    const { status, headers, body } = await request(app)
      .post('/api/login/facebook')
      .set('Content-Type', 'application/json')
      .send('{"token":')

    expect(status).toBe(400)
    expect(headers['content-type']).toContain('application/json')
    expect(body).toEqual({ error: 'Malformed JSON body', requestId: expect.any(String) })
  })

  it('should answer an oversized JSON body with a JSON 413', async () => {
    const { status, body } = await request(app)
      .post('/api/login/facebook')
      .send({ token: 'x'.repeat(200 * 1024) })

    expect(status).toBe(413)
    expect(body).toEqual({ error: 'Request body too large', requestId: expect.any(String) })
  })
})
