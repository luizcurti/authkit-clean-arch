import express from 'express'
import request from 'supertest'

const makeApp = (apiDocsEnabled: boolean): express.Express => {
  const app = express()
  jest.isolateModules(() => {
    jest.doMock('@/main/config/env', () => ({ env: { apiDocsEnabled } }))
    require('@/main/config/swagger').setupSwagger(app)
  })
  return app
}

describe('setupSwagger', () => {
  it('should serve the Swagger UI when API docs are enabled', async () => {
    const { status, text } = await request(makeApp(true)).get('/api-docs/')

    expect(status).toBe(200)
    expect(text).toContain('API Documentation')
  })

  it('should not serve anything when API docs are disabled', async () => {
    const { status } = await request(makeApp(false)).get('/api-docs/')

    expect(status).toBe(404)
  })
})
