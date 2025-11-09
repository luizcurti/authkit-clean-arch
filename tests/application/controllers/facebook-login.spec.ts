import { AuthenticationError } from '@/domain/entities/errors/authentication'
import { FacebookLoginController } from '@/application/controllers/facebook-login'
import { UnauthorizedError } from '@/application/errors'
import { RequiredString } from '@/application/validation'
import { Controller } from '@/application/controllers/controller'

describe('FacebookLoginController', () => {
  let sut: FacebookLoginController
  let facebookAuth: jest.Mock
  let token: string

  beforeAll(() => {
    token = 'any_token'
    facebookAuth = jest.fn()
  })

  beforeEach(() => {
    sut = new FacebookLoginController(facebookAuth)
    facebookAuth.mockClear()
    facebookAuth.mockResolvedValue({ accessToken: 'any_value' })
  })

  it('Should extend Controller', async () => {
    expect(sut).toBeInstanceOf(Controller)
  })

  describe('buildValidators', () => {
    it('Should build Validators correctly', () => {
      const validators = sut.buildValidators({ token })

      expect(validators).toEqual([
        new RequiredString('any_token', 'token')
      ])
    })

    it('Should build Validators correctly with different token', () => {
      const customToken = 'different_token'
      const validators = sut.buildValidators({ token: customToken })

      expect(validators).toEqual([
        new RequiredString('different_token', 'token')
      ])
    })

    it('Should build Validators correctly when token is undefined', () => {
      const validators = sut.buildValidators({ token: undefined })

      expect(validators).toEqual([
        new RequiredString(undefined as any, 'token')
      ])
    })

    it('Should build Validators correctly with empty object', () => {
      const validators = sut.buildValidators({})

      expect(validators).toEqual([
        new RequiredString(undefined as any, 'token')
      ])
    })

    it('Should build Validators with null token', () => {
      const validators = sut.buildValidators({ token: null })

      expect(validators).toEqual([
        new RequiredString(null as any, 'token')
      ])
    })
  })

  describe('perform', () => {
    it('Should call FacebookAuthentication with correct input', async () => {
      await sut.perform({ token })

      expect(facebookAuth).toHaveBeenCalledWith({ token })
      expect(facebookAuth).toHaveBeenCalledTimes(1)
    })

    it('Should return 200 with accessToken on success', async () => {
      const httpResponse = await sut.perform({ token })

      expect(httpResponse).toEqual({
        statusCode: 200,
        data: {
          accessToken: 'any_value'
        }
      })
    })

    it('Should return 401 if FacebookAuthentication throws AuthenticationError', async () => {
      facebookAuth.mockRejectedValueOnce(new AuthenticationError())
      
      const httpResponse = await sut.perform({ token })

      expect(httpResponse).toEqual({
        statusCode: 401,
        data: new UnauthorizedError()
      })
    })

    it('Should return 401 if FacebookAuthentication throws any error', async () => {
      facebookAuth.mockRejectedValueOnce(new Error('any_error'))
      
      const httpResponse = await sut.perform({ token })

      expect(httpResponse).toEqual({
        statusCode: 401,
        data: new UnauthorizedError()
      })
    })

    it('Should return 401 if FacebookAuthentication throws string error', async () => {
      facebookAuth.mockRejectedValueOnce('string error')
      
      const httpResponse = await sut.perform({ token })

      expect(httpResponse).toEqual({
        statusCode: 401,
        data: new UnauthorizedError()
      })
    })

    it('Should return 200 when perform succeeds with custom token', async () => {
      facebookAuth.mockResolvedValueOnce({ accessToken: 'success_token' })
      
      const httpResponse = await sut.perform({ token: 'custom_token' })

      expect(httpResponse).toEqual({
        statusCode: 200,
        data: {
          accessToken: 'success_token'
        }
      })
    })
  })

  describe('handle integration', () => {
    it('Should call FacebookAuthentication through handle method', async () => {
      await sut.handle({ token })

      expect(facebookAuth).toHaveBeenCalledWith({ token })
      expect(facebookAuth).toHaveBeenCalledTimes(1)
    })

    it('Should return 401 if authentication fails through handle', async () => {
      facebookAuth.mockRejectedValueOnce(new AuthenticationError())
      
      const httpResponse = await sut.handle({ token })

      expect(httpResponse).toEqual({
        statusCode: 401,
        data: new UnauthorizedError()
      })
    })

    it('Should return 200 if authentication succeeds through handle', async () => {
      const httpResponse = await sut.handle({ token })

      expect(httpResponse).toEqual({
        statusCode: 200,
        data: {
          accessToken: 'any_value'
        }
      })
    })
  })
})
