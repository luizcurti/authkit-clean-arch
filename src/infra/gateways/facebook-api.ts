import { HttpGetClient } from '@/infra/gateways'
import { LoadFacebookUser } from '@/domain/contracts/gateways'
import { ExternalServiceError } from '@/domain/entities/errors'

type AppToken = {
  access_token: string
}

type DebugToken = {
  data: {
    app_id: string
    is_valid: boolean
    user_id: string
  }
}

type UserInfo = {
  id: string
  name: string
  email?: string
}

type Input = LoadFacebookUser.Input
type Output = LoadFacebookUser.Output

export class FacebookApi implements LoadFacebookUser {
  private readonly baseUrl = 'https://graph.facebook.com'
  constructor (
    private readonly httpClient: HttpGetClient,
    private readonly clientId: string,
    private readonly clientSecret: string
  ) {
  }

  async loadUser ({ token }: Input): Promise<Output> {
    return this.getUserInfo(token)
      .then(({ id, name, email }) => {
        // No email (permission declined, phone-only account): the account cannot be linked safely
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
        if (normalizedEmail.length === 0) return undefined
        // Lowercase is the canonical form (CHK_users_email_lowercase)
        return { facebookId: id, name, email: normalizedEmail }
      })
      .catch((error) => {
        if (error instanceof ExternalServiceError) throw error
        return undefined
      })
  }

  private async getAppToken (): Promise<AppToken> {
    return this.httpClient.get({
      url: `${this.baseUrl}/oauth/access_token`,
      params: {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials'
      }
    })
  }

  private async getDebugToken (clientToken: string): Promise<DebugToken> {
    const appToken = await this.getAppToken()
    return this.httpClient.get({
      url: `${this.baseUrl}/debug_token`,
      params: {
        access_token: appToken.access_token,
        input_token: clientToken
      }
    })
  }

  private async getUserInfo (clientToken: string): Promise<UserInfo> {
    const { data } = await this.getDebugToken(clientToken)
    // A token issued to another Facebook app must not log in here (token substitution)
    if (data.is_valid !== true || data.app_id !== this.clientId) {
      throw new Error('Facebook token is invalid or was not issued for this app')
    }
    return this.httpClient.get({
      url: `${this.baseUrl}/${data.user_id}`,
      params: {
        fields: ['id', 'name', 'email'].join(','),
        access_token: clientToken
      }
    })
  }
}
