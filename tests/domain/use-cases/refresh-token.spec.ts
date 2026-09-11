import { mock, MockProxy } from 'jest-mock-extended'
import { AuthenticationError } from '@/domain/entities/errors'
import { RefreshAccessToken, setupRefreshAccessToken } from '@/domain/use-cases'
import { Hasher, TokenGenerator, UUIDGenerator } from '@/domain/contracts/gateways'
import { LoadRefreshTokenByHash, RevokeRefreshToken, SaveRefreshToken } from '@/domain/contracts/repositories'
import { AccessToken } from '@/domain/entities'

describe('RefreshAccessToken', () => {
  let refreshTokenRepository: MockProxy<LoadRefreshTokenByHash & SaveRefreshToken & RevokeRefreshToken>
  let hasher: MockProxy<Hasher>
  let tokenGenerator: MockProxy<TokenGenerator>
  let idGenerator: MockProxy<UUIDGenerator>

  let sut: RefreshAccessToken
  let refreshToken: string
  let futureDate: Date

  beforeAll(() => {
    refreshToken = 'any_refresh_token'
    futureDate = new Date(Date.now() + 60 * 1000)

    refreshTokenRepository = mock()
    refreshTokenRepository.loadByHash.mockResolvedValue({
      id: 'any_id',
      userId: 'any_user_id',
      expiresAt: futureDate
    })

    hasher = mock()
    hasher.hash.mockResolvedValue('any_hash')

    tokenGenerator = mock()
    tokenGenerator.generate.mockResolvedValue('any_access_token')

    idGenerator = mock()
    idGenerator.uuid.mockReturnValue('any_new_refresh_token')
  })

  beforeEach(() => {
    sut = setupRefreshAccessToken(refreshTokenRepository, hasher, tokenGenerator, idGenerator)
  })

  it('Should hash the refresh token and load it', async () => {
    await sut({ refreshToken })

    expect(hasher.hash).toHaveBeenCalledWith(refreshToken)
    expect(refreshTokenRepository.loadByHash).toHaveBeenCalledWith({ tokenHash: 'any_hash' })
  })

  it('Should throw AuthenticationError when refresh token is not found', async () => {
    refreshTokenRepository.loadByHash.mockResolvedValueOnce(undefined)

    const promise = sut({ refreshToken })

    await expect(promise).rejects.toThrow(new AuthenticationError())
  })

  it('Should throw AuthenticationError when refresh token is revoked', async () => {
    refreshTokenRepository.loadByHash.mockResolvedValueOnce({
      id: 'any_id',
      userId: 'any_user_id',
      expiresAt: futureDate,
      revokedAt: new Date()
    })

    const promise = sut({ refreshToken })

    await expect(promise).rejects.toThrow(new AuthenticationError())
  })

  it('Should throw AuthenticationError when refresh token is expired', async () => {
    refreshTokenRepository.loadByHash.mockResolvedValueOnce({
      id: 'any_id',
      userId: 'any_user_id',
      expiresAt: new Date(Date.now() - 1000)
    })

    const promise = sut({ refreshToken })

    await expect(promise).rejects.toThrow(new AuthenticationError())
  })

  it('Should revoke the old refresh token', async () => {
    await sut({ refreshToken })

    expect(refreshTokenRepository.revokeRefreshToken).toHaveBeenCalledWith({ id: 'any_id' })
    expect(refreshTokenRepository.revokeRefreshToken).toHaveBeenCalledTimes(1)
  })

  it('Should generate and persist a new refresh token', async () => {
    await sut({ refreshToken })

    expect(idGenerator.uuid).toHaveBeenCalledWith({ key: 'rt' })
    expect(refreshTokenRepository.saveRefreshToken).toHaveBeenCalledWith({
      userId: 'any_user_id',
      tokenHash: 'any_hash',
      expiresAt: expect.any(Date)
    })
  })

  it('Should generate a new access token with correct input', async () => {
    await sut({ refreshToken })

    expect(tokenGenerator.generate).toHaveBeenCalledWith({
      key: 'any_user_id',
      expirationInMs: AccessToken.expirationInMs
    })
  })

  it('Should return a new access token and refresh token on success', async () => {
    const output = await sut({ refreshToken })

    expect(output).toEqual({ accessToken: 'any_access_token', refreshToken: 'any_new_refresh_token' })
  })
})
