import { forbidden, HttpResponse, ok } from '@/application/helpers'
import { Middleware } from '@/application/middlewares'
import { RequiredString } from '@/application/validation'
import { AuthRequest, AuthResponse } from '@/application/dtos'

type Authorize = (input: { token: string }) => Promise<string>

export class AuthenticationMiddleware implements Middleware<AuthRequest> {
  constructor (private readonly authorize: Authorize) {}

  async handle ({ authorization }: AuthRequest): Promise<HttpResponse<AuthResponse | Error>> {
    if (!this.validate({ authorization })) return forbidden()
    try {
      const userId = await this.authorize({ token: authorization })
      return ok({ userId })
    } catch {
      return forbidden()
    }
  }

  private validate ({ authorization }: AuthRequest): boolean {
    const error = new RequiredString(authorization, 'authorization').validate()
    return error === undefined
  }
}
