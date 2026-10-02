import { UnauthorizedError } from '@/application/errors'
import { AuthenticationMiddleware } from '@/application/middlewares'

describe('AuthenticationMiddleware', () => {
  let sut: AuthenticationMiddleware
  let authorize: jest.Mock
  let authorization: string

  beforeAll(() => {
    authorization = 'Bearer any_token'
    authorize = jest.fn().mockResolvedValue('any_user_id')
  })

  beforeEach(() => {
    sut = new AuthenticationMiddleware(authorize)
  })

  it('should return a 401 Bearer challenge if authorization is empty', async () => {
    const httpResponse = await sut.handle({ authorization: '' })

    expect(httpResponse).toEqual({
      statusCode: 401,
      data: new UnauthorizedError(),
      headers: { 'WWW-Authenticate': 'Bearer' }
    })
  })

  it('should return a 401 Bearer challenge if authorization is null', async () => {
    const httpResponse = await sut.handle({ authorization: null as any })

    expect(httpResponse).toEqual({
      statusCode: 401,
      data: new UnauthorizedError(),
      headers: { 'WWW-Authenticate': 'Bearer' }
    })
  })

  it('should return a 401 Bearer challenge if authorization is undefined', async () => {
    const httpResponse = await sut.handle({ authorization: undefined as any })

    expect(httpResponse).toEqual({
      statusCode: 401,
      data: new UnauthorizedError(),
      headers: { 'WWW-Authenticate': 'Bearer' }
    })
  })

  it('should call authorize with the token after the Bearer prefix', async () => {
    await sut.handle({ authorization })

    expect(authorize).toHaveBeenCalledWith({ token: 'any_token' })
    expect(authorize).toHaveBeenCalledTimes(1)
  })

  it('should accept the Bearer scheme case-insensitively', async () => {
    await sut.handle({ authorization: 'bearer any_token' })

    expect(authorize).toHaveBeenCalledWith({ token: 'any_token' })
  })

  it.each([
    ['a bare token without scheme', 'any_token'],
    ['a different scheme', 'Basic any_token'],
    ['the Bearer scheme with no token', 'Bearer '],
    ['a token containing spaces', 'Bearer any token']
  ])('should return a 401 Bearer challenge without calling authorize for %s', async (_, value) => {
    const httpResponse = await sut.handle({ authorization: value })

    expect(httpResponse).toEqual({
      statusCode: 401,
      data: new UnauthorizedError(),
      headers: { 'WWW-Authenticate': 'Bearer' }
    })
    expect(authorize).not.toHaveBeenCalled()
  })

  it('should return a 401 Bearer challenge with error="invalid_token" if the token is rejected', async () => {
    authorize.mockRejectedValueOnce(new Error('any_error'))

    const httpResponse = await sut.handle({ authorization })

    expect(httpResponse).toEqual({
      statusCode: 401,
      data: new UnauthorizedError(),
      headers: { 'WWW-Authenticate': 'Bearer error="invalid_token"' }
    })
  })

  it('should return 200 with userId on success', async () => {
    const httpResponse = await sut.handle({ authorization })

    expect(httpResponse).toEqual({
      statusCode: 200,
      data: {
        userId: 'any_user_id'
      }
    })
  })
})
