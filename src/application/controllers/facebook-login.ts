import { HttpResponse, unauthorized, ok } from '@/application/helpers'
import { Validator, ValidatorBuilder } from '@/application/validation'
import { Controller } from '@/application/controllers'
import { FacebookAuthentication } from '@/domain/use-cases'
import { AuthenticationError } from '@/domain/entities/errors'
import { FacebookLoginRequest, FacebookLoginResponse } from '@/application/dtos'

type Model = Error | FacebookLoginResponse

export class FacebookLoginController extends Controller<FacebookLoginRequest> {
  constructor (private readonly facebookAuthentication: FacebookAuthentication) {
    super()
  }

  async perform ({ token }: FacebookLoginRequest): Promise<HttpResponse<Model>> {
    try {
      const tokens = await this.facebookAuthentication({ token: token! })
      return ok(tokens)
    } catch (error) {
      if (error instanceof AuthenticationError) return unauthorized()
      throw error
    }
  }

  override buildValidators ({ token }: FacebookLoginRequest): Validator[] {
    return [
      ...ValidatorBuilder.of({ value: token, fieldName: 'token' }).required().build()
    ]
  }
}
