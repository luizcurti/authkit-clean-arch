import request from 'supertest'
import { IBackup } from 'pg-mem'

import { makeFakeDb } from '@/tests/infra/repos/mocks'
import { app, ready } from '@/main/config/app'
import { UnauthorizedError } from '@/application/errors'
import { PgConnection } from '@/infra/repos/postgres/helpers'
import { RefreshToken } from '@/domain/entities'
import MockDate from 'mockdate'
import { createHash } from 'crypto'
import { verify } from 'jsonwebtoken'
import { ExternalServiceError } from '@/domain/entities/errors'
import { PgRefreshToken, PgUser } from '@/infra/repos/postgres/entities'
import { PgRefreshTokenRepository } from '@/infra/repos/postgres'
import { env } from '@/main/config/env'
import { AccessToken } from '@/domain/entities'

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

    afterEach(() => {
      MockDate.reset()
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

    it('should revoke the entire token family when a rotated refresh token is reused, invalidating the active session too', async () => {
      const originalRefreshToken = await login()

      const { body: rotated } = await request(app)
        .post('/api/login/refresh')
        .send({ refreshToken: originalRefreshToken })
      const rotatedRefreshToken = rotated.refreshToken as string

      // A replay after the grace window is reuse
      MockDate.set(Date.now() + RefreshToken.reuseGraceInMs + 1000)
      await request(app).post('/api/login/refresh').send({ refreshToken: originalRefreshToken })

      const { status, body } = await request(app)
        .post('/api/login/refresh')
        .send({ refreshToken: rotatedRefreshToken })

      expect(status).toBe(401)
      expect(body.error).toBe(new UnauthorizedError().message)
    })

    it('should reject a replay within the grace window without revoking the token family (concurrent refresh)', async () => {
      const originalRefreshToken = await login()
      const { body: rotated } = await request(app)
        .post('/api/login/refresh')
        .send({ refreshToken: originalRefreshToken })

      const replay = await request(app).post('/api/login/refresh').send({ refreshToken: originalRefreshToken })
      const { status } = await request(app)
        .post('/api/login/refresh')
        .send({ refreshToken: rotated.refreshToken })

      expect(replay.status).toBe(401)
      expect(status).toBe(200)
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

  describe('POST /logout', () => {
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
      loadUserSpy.mockResolvedValueOnce({ facebookId: 'any_id', name: 'any_name', email: 'any_email' })
      const { body } = await request(app).post('/api/login/facebook').send({ token: 'valid_token' })
      return body.refreshToken
    }

    it('should return 204 and revoke the session so no refresh token of the family works anymore', async () => {
      const originalRefreshToken = await login()
      const { body: rotated } = await request(app).post('/api/login/refresh').send({ refreshToken: originalRefreshToken })

      const { status } = await request(app).post('/api/logout').send({ refreshToken: rotated.refreshToken })
      const refresh = await request(app).post('/api/login/refresh').send({ refreshToken: rotated.refreshToken })

      expect(status).toBe(204)
      expect(refresh.status).toBe(401)
    })

    it('should return 204 for an unknown refresh token without revealing it does not exist', async () => {
      const { status } = await request(app).post('/api/logout').send({ refreshToken: 'unknown_refresh_token' })

      expect(status).toBe(204)
    })

    it('should return 400 when refreshToken is not provided', async () => {
      const { status, body } = await request(app).post('/api/logout').send({})

      expect(status).toBe(400)
      expect(body.error).toBeDefined()
    })
  })
  describe('inputs and outputs', () => {
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
      loadUserSpy.mockReset()
    })

    afterEach(() => {
      MockDate.reset()
      jest.restoreAllMocks()
    })

    const fbUser = { facebookId: 'fb_1', name: 'Ana Braga', email: 'ana@mail.com' }
    const login = async (user = fbUser) => {
      loadUserSpy.mockResolvedValueOnce(user)
      return request(app).post('/api/login/facebook').send({ token: 'valid_token' })
    }
    const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex')

    describe.each([
      ['/api/login/facebook', 'token'],
      ['/api/login/refresh', 'refreshToken'],
      ['/api/logout', 'refreshToken']
    ])('POST %s validation', (path, field) => {
      it.each([
        ['missing', {}],
        ['null', { [field]: null }],
        ['an empty string', { [field]: '' }]
      ])(`should answer 400 when ${field} is %s`, async (_, body) => {
        const { status, headers, body: response } = await request(app).post(path).send(body)

        expect(status).toBe(400)
        expect(headers['content-type']).toContain('application/json')
        expect(response).toEqual({ error: `The field ${field} is required`, requestId: expect.any(String) })
      })

      it.each([
        ['a number', 123],
        ['a boolean', true],
        ['an object', { value: 'x' }],
        ['an array', ['x']]
      ])(`should answer 400 when ${field} is %s`, async (_, value) => {
        const { status, body } = await request(app).post(path).send({ [field]: value })

        expect(status).toBe(400)
        expect(body).toEqual({ error: `The field ${field} must be a string`, requestId: expect.any(String) })
        expect(loadUserSpy).not.toHaveBeenCalled()
      })

      it('should answer 400 for a form-encoded body, which it does not read', async () => {
        const { status } = await request(app).post(path).type('form').send(`${field}=value`)

        expect(status).toBe(400)
      })

      it('should answer a malformed JSON body with 400', async () => {
        const { status, body } = await request(app).post(path).set('Content-Type', 'application/json').send(`{"${field}":`)

        expect(status).toBe(400)
        expect(body).toEqual({ error: 'Malformed JSON body', requestId: expect.any(String) })
      })

      it('should answer a body over 100KB with 413', async () => {
        const { status, body } = await request(app).post(path).send({ [field]: 'x'.repeat(101 * 1024) })

        expect(status).toBe(413)
        expect(body).toEqual({ error: 'Request body too large', requestId: expect.any(String) })
      })

      it('should answer 404 to GET, which it does not route', async () => {
        const { status, body } = await request(app).get(path)

        expect(status).toBe(404)
        expect(body).toEqual({ error: 'Not found', requestId: expect.any(String) })
      })
    })

    describe('POST /login/facebook', () => {
      it('should answer exactly an access token and a refresh token', async () => {
        const { status, headers, body } = await login()

        expect(status).toBe(200)
        expect(headers['content-type']).toContain('application/json')
        expect(headers['x-request-id']).toEqual(expect.any(String))
        expect(Object.keys(body).sort()).toEqual(['accessToken', 'refreshToken'])
        expect(body.refreshToken).toMatch(/^rt_[0-9a-f-]{36}$/)
      })

      it('should issue an access token for the user, valid for 15 minutes, for this API only', async () => {
        const { body } = await login()
        const user = await connection.getRepository(PgUser).findOneByOrFail({ email: 'ana@mail.com' })

        const payload = verify(body.accessToken, env.jwt.secret, { issuer: env.jwt.issuer, audience: env.jwt.audience }) as { sub: string, exp: number, iat: number }

        expect(payload.sub).toBe(user.id.toString())
        expect((payload.exp - payload.iat) * 1000).toBe(AccessToken.expirationInMs)
      })

      it('should store only the hash of the refresh token, expiring in 7 days', async () => {
        const { body } = await login()

        const [stored] = await connection.getRepository(PgRefreshToken).find()
        expect(stored.tokenHash).toBe(sha256(body.refreshToken))
        expect(JSON.stringify(stored)).not.toContain(body.refreshToken)
        expect(stored.expiresAt.getTime() - Date.now()).toBeGreaterThan(7 * 24 * 60 * 60 * 1000 - 60 * 1000)
      })

      it('should create the account on the first login, with the Facebook data', async () => {
        await login()

        const users = await connection.getRepository(PgUser).find()
        expect(users).toEqual([expect.objectContaining({ name: 'Ana Braga', email: 'ana@mail.com', facebookId: 'fb_1' })])
      })

      it('should reuse the account on later logins, keeping its stored name, and open a separate session each time', async () => {
        const first = await login()
        const second = await login({ ...fbUser, name: 'Ana B.' })

        const users = await connection.getRepository(PgUser).find()
        expect(users).toEqual([expect.objectContaining({ name: 'Ana Braga', facebookId: 'fb_1' })])
        const sessions = await connection.getRepository(PgRefreshToken).find()
        expect(sessions).toHaveLength(2)
        expect(new Set(sessions.map(s => s.familyId)).size).toBe(2)
        expect(second.body.refreshToken).not.toBe(first.body.refreshToken)
      })

      it('should link an existing account found by email that has no Facebook identity yet', async () => {
        const { id } = await connection.getRepository(PgUser).save({ email: 'ana@mail.com', name: 'Ana' })

        const { status, body } = await login()

        expect(status).toBe(200)
        expect((verify(body.accessToken, env.jwt.secret) as { sub: string }).sub).toBe(id.toString())
        expect(await connection.getRepository(PgUser).findOneBy({ id })).toMatchObject({ facebookId: 'fb_1' })
      })

      it('should answer 401 when the email belongs to an account linked to another Facebook identity', async () => {
        await connection.getRepository(PgUser).save({ email: 'ana@mail.com', name: 'Ana', facebookId: 'fb_other' })

        const { status, body } = await login()

        expect(status).toBe(401)
        expect(body).toEqual({ error: 'unauthorized', requestId: expect.any(String) })
        expect(await connection.getRepository(PgRefreshToken).count()).toBe(0)
      })

      it('should answer 401 without a Bearer challenge when Facebook rejects the token', async () => {
        loadUserSpy.mockResolvedValueOnce(undefined)

        const { status, headers, body } = await request(app).post('/api/login/facebook').send({ token: 'invalid' })

        expect(status).toBe(401)
        expect(headers['www-authenticate']).toBeUndefined()
        expect(body).toEqual({ error: 'unauthorized', requestId: expect.any(String) })
      })

      it('should pass the token to Facebook as received', async () => {
        await login()

        expect(loadUserSpy).toHaveBeenCalledWith({ token: 'valid_token' })
      })

      it('should answer 502 when Facebook is unavailable', async () => {
        loadUserSpy.mockRejectedValueOnce(new ExternalServiceError())

        const { status, body } = await request(app).post('/api/login/facebook').send({ token: 'any' })

        expect(status).toBe(502)
        expect(body).toEqual({ error: 'An upstream service failed to respond', requestId: expect.any(String) })
      })

      // Login is not transactional (it calls Facebook)
      it('should answer an unexpected failure with a generic 500, the next login still working', async () => {
        jest.spyOn(PgRefreshTokenRepository.prototype, 'saveRefreshToken').mockRejectedValueOnce(new Error('disk full'))

        const { status, body } = await login()
        const retried = await login()

        expect(status).toBe(500)
        expect(body).toEqual({ error: 'Server failed. Try again later', requestId: expect.any(String) })
        expect(retried.status).toBe(200)
        expect(await connection.getRepository(PgUser).count()).toBe(1)
      })

      it('should ignore unknown fields', async () => {
        loadUserSpy.mockResolvedValueOnce(fbUser)

        const { status } = await request(app).post('/api/login/facebook').send({ token: 'valid_token', userId: '1', admin: true })

        expect(status).toBe(200)
      })
    })

    describe('POST /login/refresh', () => {
      it('should answer exactly a new pair whose access token authorizes the user', async () => {
        const { body: session } = await login()

        const { status, body } = await request(app).post('/api/login/refresh').send({ refreshToken: session.refreshToken })
        const picture = await request(app).delete('/api/users/picture').set({ authorization: `Bearer ${body.accessToken as string}` })

        expect(status).toBe(200)
        expect(Object.keys(body).sort()).toEqual(['accessToken', 'refreshToken'])
        expect(body.refreshToken).toMatch(/^rt_[0-9a-f-]{36}$/)
        expect(picture.status).toBe(200)
      })

      it('should keep rotating along the chain, each token working once', async () => {
        let { body: { refreshToken } } = await login()

        for (let i = 0; i < 3; i++) {
          const { status, body } = await request(app).post('/api/login/refresh').send({ refreshToken })
          expect(status).toBe(200)
          refreshToken = body.refreshToken
        }
        const sessions = await connection.getRepository(PgRefreshToken).find()
        expect(sessions).toHaveLength(4)
        expect(new Set(sessions.map(s => s.familyId)).size).toBe(1)
        expect(sessions.filter(s => s.revokedAt === null)).toHaveLength(1)
      })

      it('should answer 401 for a refresh token past its 7 days', async () => {
        const { body: session } = await login()
        MockDate.set(Date.now() + 7 * 24 * 60 * 60 * 1000 + 1000)

        const { status, body } = await request(app).post('/api/login/refresh').send({ refreshToken: session.refreshToken })

        expect(status).toBe(401)
        expect(body).toEqual({ error: 'unauthorized', requestId: expect.any(String) })
      })

      // pg-mem does not roll back: covered in tests/postgres/refresh-token-rotation.pg.test.ts
      it('should answer a database failure with a generic 500', async () => {
        const { body: session } = await login()
        jest.spyOn(PgRefreshTokenRepository.prototype, 'saveRefreshToken').mockRejectedValueOnce(new Error('disk full'))

        const { status, body } = await request(app).post('/api/login/refresh').send({ refreshToken: session.refreshToken })

        expect(status).toBe(500)
        expect(body).toEqual({ error: 'Server failed. Try again later', requestId: expect.any(String) })
      })
    })

    describe('POST /logout', () => {
      it('should answer 204 with an empty body', async () => {
        const { body: session } = await login()

        const { status, text, headers } = await request(app).post('/api/logout').send({ refreshToken: session.refreshToken })

        expect(status).toBe(204)
        expect(text).toBe('')
        expect(headers['x-request-id']).toEqual(expect.any(String))
      })

      it('should end only that session, leaving the user\'s other sessions working', async () => {
        const { body: phone } = await login()
        const { body: laptop } = await login()

        await request(app).post('/api/logout').send({ refreshToken: phone.refreshToken })
        const { status } = await request(app).post('/api/login/refresh').send({ refreshToken: laptop.refreshToken })

        expect(status).toBe(200)
      })

      it('should answer 204 again when logging out twice', async () => {
        const { body: session } = await login()

        await request(app).post('/api/logout').send({ refreshToken: session.refreshToken })
        const { status } = await request(app).post('/api/logout').send({ refreshToken: session.refreshToken })

        expect(status).toBe(204)
      })

      it('should end the session even when given an already rotated token of it', async () => {
        const { body: session } = await login()
        const { body: rotated } = await request(app).post('/api/login/refresh').send({ refreshToken: session.refreshToken })

        await request(app).post('/api/logout').send({ refreshToken: session.refreshToken })
        const { status } = await request(app).post('/api/login/refresh').send({ refreshToken: rotated.refreshToken })

        expect(status).toBe(401)
      })
    })
  })
})
