import { badRequest, HttpResponse, serverError } from '@/application/helpers'
import { ValidationComposite, Validator } from '@/application/validation'

export abstract class Controller<T = unknown> {
  abstract perform (httpRequest: T): Promise<HttpResponse>

  buildValidators (_httpRequest: T): Validator[] {
    return []
  }

  async handle (httpRequest: T): Promise<HttpResponse> {
    const error = this.validate(httpRequest)
    if (error !== undefined) {
      return badRequest(error)
    }
    try {
      return await this.perform(httpRequest) // se não por await não captura o erro
    } catch (error: unknown) {
      return serverError(error)
    }
  }

  private validate (httpRequest: T): Error | undefined {
    const validators = this.buildValidators(httpRequest)
    return new ValidationComposite(validators).validate()
  }
}
