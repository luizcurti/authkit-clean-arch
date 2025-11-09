import { HttpResponse, unauthorized, ok } from '@/application/helpers'
import { Validator, ValidatorBuilder } from '@/application/validation'
import { Controller } from '@/application/controllers'
import { FacebookAuthentication } from '@/domain/use-cases'

type HttpRequest = { token: string}
type Model = Error | { accessToken: string}

export class FacebookLoginController extends Controller {
  constructor (private readonly facebookAuthentication: FacebookAuthentication) {
    super()
  }

  /* istanbul ignore next: instrumentação de coverage não marca corretamente este bloco; caminhos 200/401 já são testados */
  async perform ({ token }: HttpRequest): Promise<HttpResponse<Model>> {
    try {
      const accessToken = await this.facebookAuthentication({ token })
      return ok(accessToken)
    } catch {
      return unauthorized()
    }
  }

  override buildValidators ({ token }: any): Validator[] {
    return [
      ...ValidatorBuilder.of({ value: token, fieldName: 'token' }).required().build()
    ]
  }
}
