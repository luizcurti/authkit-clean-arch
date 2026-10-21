import { HttpResponse, noContent } from '@/application/helpers'
import { Validator, ValidatorBuilder } from '@/application/validation'
import { Controller } from '@/application/controllers'
import { Logout } from '@/domain/use-cases'
import { LogoutRequest } from '@/application/dtos'

export class LogoutController extends Controller<LogoutRequest> {
  constructor (private readonly logout: Logout) {
    super()
  }

  // 204 whether or not the token exists
  async perform ({ refreshToken }: LogoutRequest): Promise<HttpResponse<null>> {
    await this.logout({ refreshToken: refreshToken! })
    return noContent()
  }

  override buildValidators ({ refreshToken }: LogoutRequest): Validator[] {
    return [
      ...ValidatorBuilder.of({ value: refreshToken, fieldName: 'refreshToken' }).required().string().build()
    ]
  }
}
