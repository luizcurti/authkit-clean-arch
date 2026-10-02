import { bearerChallenge, HttpResponse, ok } from '@/application/helpers'
import { Middleware } from '@/application/middlewares'
import { RequiredString } from '@/application/validation'
import { AuthRequest, AuthResponse } from '@/application/dtos'

type Authorize = (input: { token: string }) => Promise<string>

export class AuthenticationMiddleware implements Middleware<AuthRequest> {
  constructor (private readonly authorize: Authorize) {}

  async handle ({ authorization }: AuthRequest): Promise<HttpResponse<AuthResponse | Error>> {
    if (!this.validate({ authorization })) return bearerChallenge()
    const token = this.extractBearerToken(authorization)
    if (token === undefined) return bearerChallenge()
    try {
      const userId = await this.authorize({ token })
      return ok({ userId })
    } catch {
      return bearerChallenge('invalid_token')
    }
  }

  private validate ({ authorization }: AuthRequest): boolean {
    const error = new RequiredString(authorization, 'authorization').validate()
    return error === undefined
  }

  // RFC 6750: only "Bearer <token>"
  private extractBearerToken (authorization: string): string | undefined {
    const match = /^Bearer\s+(\S+)$/i.exec(authorization)
    return match?.[1]
  }
}
