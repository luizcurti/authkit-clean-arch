import { LoadFacebookUser, TokenGenerator, Hasher, UUIDGenerator } from '@/domain/contracts/gateways'
import { SaveFacebookAccount, LoadUserAccount, SaveRefreshToken } from '@/domain/contracts/repositories'
import { AuthenticationError } from '@/domain/entities/errors'
import { AccessToken, RefreshToken, FacebookAccount } from '@/domain/entities'

type Setup = (
  facebook: LoadFacebookUser,
  userAccountRepository: LoadUserAccount & SaveFacebookAccount,
  refreshTokenRepository: SaveRefreshToken,
  token: TokenGenerator,
  hasher: Hasher,
  idGenerator: UUIDGenerator
) => FacebookAuthentication
type Input = { token: string }
type Output = { accessToken: string, refreshToken: string }
export type FacebookAuthentication = (input: Input) => Promise<Output>

export const setupFacebookAuthentication: Setup = (
  facebook,
  userAccountRepository,
  refreshTokenRepository,
  token,
  hasher,
  idGenerator
) => {
  return async input => {
    const fbData = await facebook.loadUser(input)
    if (fbData !== undefined) {
      const accountData = await userAccountRepository.load({ email: fbData.email })
      const facebookAccount = new FacebookAccount(fbData, accountData)
      const { id } = await userAccountRepository.saveWithFacebook(facebookAccount)
      const accessToken = await token.generate({ key: id, expirationInMs: AccessToken.expirationInMs })

      const refreshToken = idGenerator.uuid({ key: 'rt' })
      const familyId = idGenerator.uuid({ key: 'rtf' })
      const tokenHash = await hasher.hash(refreshToken)
      await refreshTokenRepository.saveRefreshToken({
        userId: id,
        tokenHash,
        expiresAt: new Date(Date.now() + RefreshToken.expirationInMs),
        familyId
      })

      return { accessToken, refreshToken }
    }
    throw new AuthenticationError()
  }
}
