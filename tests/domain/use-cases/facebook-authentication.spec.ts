import { mock, MockProxy } from 'jest-mock-extended'
import * as FacebookAccountModule from '@/domain/entities/facebook-account'
import { AuthenticationError } from '@/domain/entities/errors'
import { FacebookAuthentication } from '@/domain/use-cases'
import { LoadFacebookUser, TokenGenerator, Hasher, UUIDGenerator } from '@/domain/contracts/gateways'
import { LoadUserAccount, SaveFacebookAccount, SaveRefreshToken } from '@/domain/contracts/repositories'
import { AccessToken } from '@/domain/entities'
import { setupFacebookAuthentication } from '../../../src/domain/use-cases/facebook-authentication'

jest.mock('@/domain/entities/facebook-account')
const MockedFacebookAccount = FacebookAccountModule.FacebookAccount as unknown as jest.Mock

describe('FacebookAuthentication', () => {
  let facebookApi: MockProxy<LoadFacebookUser>
  let crypto: MockProxy<TokenGenerator>
  let userAccountRepository: MockProxy<LoadUserAccount & SaveFacebookAccount>
  let refreshTokenRepository: MockProxy<SaveRefreshToken>
  let hasher: MockProxy<Hasher>
  let idGenerator: MockProxy<UUIDGenerator>

  let sut: FacebookAuthentication
  let token: string

  beforeAll(() => {
    token = 'working_token'
    facebookApi = mock()
    facebookApi.loadUser.mockResolvedValue({
      name: 'any_fb_name',
      email: 'any_fb_email',
      facebookId: 'any_fb_id'
    })
    userAccountRepository = mock()
    userAccountRepository.load.mockResolvedValue(undefined)
    userAccountRepository.saveWithFacebook.mockResolvedValue({ id: 'any_account_id' })
    refreshTokenRepository = mock()
    crypto = mock()
    crypto.generate.mockResolvedValue('any_generated_token')
    hasher = mock()
    hasher.hash.mockResolvedValue('any_hashed_token')
    idGenerator = mock()
    idGenerator.uuid.mockImplementation(({ key }) => key === 'rtf' ? 'any_family_id' : 'any_refresh_token')
  })

  beforeEach(() => {
    sut = setupFacebookAuthentication(
      facebookApi,
      userAccountRepository,
      refreshTokenRepository,
      crypto,
      hasher,
      idGenerator
    )
  })

  it('Should call LoadFacebookUser with correct input', async () => {
    await sut({ token })
    expect(facebookApi.loadUser).toHaveBeenCalledWith({ token })
    expect(facebookApi.loadUser).toHaveBeenCalledTimes(1)
  })

  it('Should throw AuthenticationError when LoadFacebookUser returns undefined', async () => {
    facebookApi.loadUser.mockResolvedValueOnce(undefined)

    const promise = sut({ token })
    await expect(promise).rejects.toThrow(new AuthenticationError())
  })

  it('Should call LoadUserAccountRepo when LoadFacebookUser returns data', async () => {
    await sut({ token })

    expect(userAccountRepository.load).toHaveBeenCalledWith({ email: 'any_fb_email' })
    expect(userAccountRepository.load).toHaveBeenCalledTimes(1)
  })

  it('Should call SaveFacebookAccount with FacebookAccount', async () => {
    const FacebookAccountStub = jest.fn().mockImplementation(() => ({ any: 'any' }))
    MockedFacebookAccount.mockImplementation(FacebookAccountStub)

    await sut({ token })

    expect(userAccountRepository.saveWithFacebook).toHaveBeenCalledWith({ any: 'any' })
    expect(userAccountRepository.saveWithFacebook).toHaveBeenCalledTimes(1)
  })

  it('Should call TokenGenerator with correct input', async () => {
    await sut({ token })

    expect(crypto.generate).toHaveBeenCalledWith({
      key: 'any_account_id',
      expirationInMs: AccessToken.expirationInMs
    })
    expect(crypto.generate).toHaveBeenCalledTimes(1)
  })

  it('Should generate and persist a refresh token with a new token family', async () => {
    await sut({ token })

    expect(idGenerator.uuid).toHaveBeenCalledWith({ key: 'rt' })
    expect(idGenerator.uuid).toHaveBeenCalledWith({ key: 'rtf' })
    expect(hasher.hash).toHaveBeenCalledWith('any_refresh_token')
    expect(refreshTokenRepository.saveRefreshToken).toHaveBeenCalledWith({
      userId: 'any_account_id',
      tokenHash: 'any_hashed_token',
      expiresAt: expect.any(Date),
      familyId: 'any_family_id'
    })
    expect(refreshTokenRepository.saveRefreshToken).toHaveBeenCalledTimes(1)
  })

  it('Should return an AccessToken and a RefreshToken on success', async () => {
    const authOutput = await sut({ token })

    expect(authOutput).toEqual({ accessToken: 'any_generated_token', refreshToken: 'any_refresh_token' })
  })

  it('Should rethrow if LoadFacebookApi throws', async () => {
    facebookApi.loadUser.mockRejectedValueOnce(new Error('fb_error'))

    const promise = sut({ token })

    await expect(promise).rejects.toThrow(new Error('fb_error'))
  })

  it('Should rethrow if LoadUserAccount throws', async () => {
    userAccountRepository.load.mockRejectedValueOnce(new Error('load_error'))

    const promise = sut({ token })

    await expect(promise).rejects.toThrow(new Error('load_error'))
  })

  it('Should rethrow if SaveUserAccountRepository throws', async () => {
    userAccountRepository.saveWithFacebook.mockRejectedValueOnce(new Error('save_error'))

    const promise = sut({ token })

    await expect(promise).rejects.toThrow(new Error('save_error'))
  })

  it('Should rethrow if TokenGenerator throws', async () => {
    crypto.generate.mockRejectedValueOnce(new Error('token_error'))

    const promise = sut({ token })

    await expect(promise).rejects.toThrow(new Error('token_error'))
  })

  it('Should rethrow if SaveRefreshToken throws', async () => {
    refreshTokenRepository.saveRefreshToken.mockRejectedValueOnce(new Error('refresh_token_error'))

    const promise = sut({ token })

    await expect(promise).rejects.toThrow(new Error('refresh_token_error'))
  })
})
