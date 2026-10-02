import { LogoutController } from '@/application/controllers/logout'
import { RequiredString, StringType } from '@/application/validation'
import { Controller } from '@/application/controllers/controller'

describe('LogoutController', () => {
  let sut: LogoutController
  let logout: jest.Mock
  let refreshToken: string

  beforeAll(() => {
    refreshToken = 'any_refresh_token'
    logout = jest.fn()
  })

  beforeEach(() => {
    logout.mockReset().mockResolvedValue(undefined)
    sut = new LogoutController(logout)
  })

  it('Should extend Controller', async () => {
    expect(sut).toBeInstanceOf(Controller)
  })

  it('Should build Validators correctly', () => {
    const validators = sut.buildValidators({ refreshToken })

    expect(validators).toEqual([
      new RequiredString(refreshToken, 'refreshToken'),
      new StringType(refreshToken, 'refreshToken')
    ])
  })

  it('Should call Logout with correct input', async () => {
    await sut.perform({ refreshToken })

    expect(logout).toHaveBeenCalledWith({ refreshToken })
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('Should return 204 on success', async () => {
    const httpResponse = await sut.perform({ refreshToken })

    expect(httpResponse).toEqual({ statusCode: 204, data: null })
  })

  it('Should return 500 if Logout throws', async () => {
    logout.mockRejectedValueOnce(new Error('db_error'))

    const httpResponse = await sut.handle({ refreshToken })

    expect(httpResponse.statusCode).toBe(500)
  })
})
