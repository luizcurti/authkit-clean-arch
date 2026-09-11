import request from 'supertest'
import { IBackup } from 'pg-mem'

import { makeFakeDb } from '@/tests/infra/repos/mocks'
import { app, ready } from '@/main/config/app'
import { UnauthorizedError } from '@/application/errors'
import { PgConnection } from '@/infra/repos/postgres/helpers'

const loadUserSpy = jest.fn()

jest.mock('@/infra/gateways/facebook-api', () => ({
  FacebookApi: jest.fn().mockReturnValue({ loadUser: loadUserSpy })
}))

describe('Login Routes', () => {
  describe('POST /login/facebook', () => {
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

    it('should return 200 with accessToken and refreshToken on valid facebook token', async () => {
      loadUserSpy.mockResolvedValueOnce({
        facebookId: 'any_id',
        name: 'any_name',
        email: 'any_email'
      })

      const { status, body } = await request(app)
        .post('/api/login/facebook')
        .send({ token: 'valid_token' })

      expect(status).toBe(200)
      expect(body.accessToken).toBeDefined()
      expect(typeof body.accessToken).toBe('string')
      expect(body.refreshToken).toBeDefined()
      expect(typeof body.refreshToken).toBe('string')
    })

    it('should return 401 with error message on invalid facebook token', async () => {
      const { status, body } = await request(app)
        .post('/api/login/facebook')
        .send({ token: 'invalid_token' })

      expect(status).toBe(401)
      expect(body.error).toBe(new UnauthorizedError().message)
    })

    it('should return 400 when token is not provided', async () => {
      const { status, body } = await request(app)
        .post('/api/login/facebook')
        .send({})

      expect(status).toBe(400)
      expect(body.error).toBeDefined()
    })

    it('should return 400 when token is empty string', async () => {
      const { status, body } = await request(app)
        .post('/api/login/facebook')
        .send({ token: '' })

      expect(status).toBe(400)
      expect(body.error).toBeDefined()
    })

    it('should return 400 when token is null', async () => {
      const { status, body } = await request(app)
        .post('/api/login/facebook')
        .send({ token: null })

      expect(status).toBe(400)
      expect(body.error).toBeDefined()
    })
  })

  describe('POST /login/refresh', () => {
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

    const login = async (): Promise<string> => {
      loadUserSpy.mockResolvedValueOnce({
        facebookId: 'any_id',
        name: 'any_name',
        email: 'any_email'
      })
      const { body } = await request(app)
        .post('/api/login/facebook')
        .send({ token: 'valid_token' })
      return body.refreshToken
    }

    it('should return 200 with new accessToken and refreshToken on valid refresh token', async () => {
      const refreshToken = await login()

      const { status, body } = await request(app)
        .post('/api/login/refresh')
        .send({ refreshToken })

      expect(status).toBe(200)
      expect(typeof body.accessToken).toBe('string')
      expect(typeof body.refreshToken).toBe('string')
      expect(body.refreshToken).not.toBe(refreshToken)
    })

    it('should return 401 when refresh token was already rotated (reuse)', async () => {
      const refreshToken = await login()
      await request(app).post('/api/login/refresh').send({ refreshToken })

      const { status, body } = await request(app)
        .post('/api/login/refresh')
        .send({ refreshToken })

      expect(status).toBe(401)
      expect(body.error).toBe(new UnauthorizedError().message)
    })

    it('should return 401 when refresh token is unknown', async () => {
      const { status, body } = await request(app)
        .post('/api/login/refresh')
        .send({ refreshToken: 'unknown_refresh_token' })

      expect(status).toBe(401)
      expect(body.error).toBe(new UnauthorizedError().message)
    })

    it('should return 400 when refreshToken is not provided', async () => {
      const { status, body } = await request(app)
        .post('/api/login/refresh')
        .send({})

      expect(status).toBe(400)
      expect(body.error).toBeDefined()
    })
  })
})
