import { AuthenticationError } from '@/domain/entities/errors/authentication'
import { RefreshTokenController } from '@/application/controllers/refresh-token'
import { UnauthorizedError } from '@/application/errors'
import { RequiredString } from '@/application/validation'
import { Controller } from '@/application/controllers/controller'

describe('RefreshTokenController', () => {
  let sut: RefreshTokenController
  let refreshAccessToken: jest.Mock
  let refreshToken: string

  beforeAll(() => {
    refreshToken = 'any_refresh_token'
    refreshAccessToken = jest.fn()
  })

  beforeEach(() => {
    sut = new RefreshTokenController(refreshAccessToken)
    refreshAccessToken.mockClear()
    refreshAccessToken.mockResolvedValue({ accessToken: 'any_access_token', refreshToken: 'any_new_refresh_token' })
  })

  it('Should extend Controller', async () => {
    expect(sut).toBeInstanceOf(Controller)
  })

  describe('buildValidators', () => {
    it('Should build Validators correctly', () => {
      const validators = sut.buildValidators({ refreshToken })

      expect(validators).toEqual([
        new RequiredString(refreshToken, 'refreshToken')
      ])
    })

    it('Should build Validators correctly when refreshToken is undefined', () => {
      const validators = sut.buildValidators({})

      expect(validators).toEqual([
        new RequiredString(undefined as any, 'refreshToken')
      ])
    })
  })

  describe('perform', () => {
    it('Should call RefreshAccessToken with correct input', async () => {
      await sut.perform({ refreshToken })

      expect(refreshAccessToken).toHaveBeenCalledWith({ refreshToken })
      expect(refreshAccessToken).toHaveBeenCalledTimes(1)
    })

    it('Should return 200 with new tokens on success', async () => {
      const httpResponse = await sut.perform({ refreshToken })

      expect(httpResponse).toEqual({
        statusCode: 200,
        data: {
          accessToken: 'any_access_token',
          refreshToken: 'any_new_refresh_token'
        }
      })
    })

    it('Should return 401 if RefreshAccessToken throws AuthenticationError', async () => {
      refreshAccessToken.mockRejectedValueOnce(new AuthenticationError())

      const httpResponse = await sut.perform({ refreshToken })

      expect(httpResponse).toEqual({
        statusCode: 401,
        data: new UnauthorizedError()
      })
    })
  })
})
