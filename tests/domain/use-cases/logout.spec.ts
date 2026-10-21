import { mock, MockProxy } from 'jest-mock-extended'
import { Logout, setupLogout } from '@/domain/use-cases'
import { Hasher } from '@/domain/contracts/gateways'
import { LoadRefreshTokenByHash, RevokeRefreshTokenFamily } from '@/domain/contracts/repositories'

describe('Logout', () => {
  let refreshTokenRepository: MockProxy<LoadRefreshTokenByHash & RevokeRefreshTokenFamily>
  let hasher: MockProxy<Hasher>
  let sut: Logout

  beforeAll(() => {
    refreshTokenRepository = mock()
    refreshTokenRepository.loadByHash.mockResolvedValue({
      id: 'any_id',
      userId: 'any_user_id',
      expiresAt: new Date(Date.now() + 60 * 1000),
      familyId: 'any_family_id'
    })
    hasher = mock()
    hasher.hash.mockResolvedValue('any_hash')
  })

  beforeEach(() => {
    sut = setupLogout(refreshTokenRepository, hasher)
  })

  it('Should hash the refresh token and load it', async () => {
    await sut({ refreshToken: 'any_refresh_token' })

    expect(hasher.hash).toHaveBeenCalledWith('any_refresh_token')
    expect(refreshTokenRepository.loadByHash).toHaveBeenCalledWith({ tokenHash: 'any_hash' })
  })

  it('Should revoke the whole token family of the refresh token', async () => {
    await sut({ refreshToken: 'any_refresh_token' })

    expect(refreshTokenRepository.revokeRefreshTokenFamily).toHaveBeenCalledWith({ familyId: 'any_family_id' })
  })

  it('Should resolve without revoking anything when the refresh token is unknown', async () => {
    refreshTokenRepository.loadByHash.mockResolvedValueOnce(undefined)

    await expect(sut({ refreshToken: 'unknown' })).resolves.toBeUndefined()
    expect(refreshTokenRepository.revokeRefreshTokenFamily).not.toHaveBeenCalled()
  })
})
