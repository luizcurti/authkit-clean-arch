import request from 'supertest'
import { IBackup } from 'pg-mem'

import { makeFakeDb } from '@/tests/infra/repos/mocks'
import { app, ready } from '@/main/config/app'
import { UnauthorizedError } from '@/application/errors'
import { PgConnection } from '@/infra/repos/postgres/helpers'

describe('Login Routes', () => {
  describe('POST /login/facebook', () => {
    let pgBackup: IBackup
    let connection: PgConnection
    const loadUserSpy = jest.fn()

    jest.mock('@/infra/gateways/facebook-api', () => ({
      FacebookApi: jest.fn().mockReturnValue({ loadUser: loadUserSpy })
    }))

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

    it('should return 200 with accessToken on valid facebook token', async () => {
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
})
