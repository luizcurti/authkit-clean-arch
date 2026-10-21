import request from 'supertest'
import { app } from '@/main/config/app'
import { UnauthorizedError } from '@/application/errors'
import { auth } from '@/main/middlewares'
import { makeAuthorization } from '@/tests/main/mocks/authorization'

describe('AuthenticationMiddleware', () => {
  it('should return 401 with a Bearer challenge if authorization header was not provided', async () => {
    app.get('/fake_route', auth)

    const { status, body, headers } = await request(app)
      .get('/fake_route')

    expect(status).toBe(401)
    expect(headers['www-authenticate']).toBe('Bearer')
    expect(body.error).toBe(new UnauthorizedError().message)
  })

  it('should return 200 if authorization header is valid', async () => {
    const authorization = await makeAuthorization('any_user_id')
    app.get('/fake_route', auth, (req, res) => {
      res.json(req.locals)
    })

    const { status, body } = await request(app)
      .get('/fake_route')
      .set({ authorization })

    expect(status).toBe(200)
    expect(body).toEqual({ userId: 'any_user_id', requestId: expect.any(String) })
  })
})
