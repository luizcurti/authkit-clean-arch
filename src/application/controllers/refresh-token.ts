import { HttpResponse, unauthorized, ok } from '@/application/helpers'
import { Validator, ValidatorBuilder } from '@/application/validation'
import { Controller } from '@/application/controllers'
import { RefreshAccessToken } from '@/domain/use-cases'
import { RefreshTokenRequest, RefreshTokenResponse } from '@/application/dtos'

type Model = Error | RefreshTokenResponse

export class RefreshTokenController extends Controller<RefreshTokenRequest> {
  constructor (private readonly refreshAccessToken: RefreshAccessToken) {
    super()
  }

  async perform ({ refreshToken }: RefreshTokenRequest): Promise<HttpResponse<Model>> {
    try {
      const tokens = await this.refreshAccessToken({ refreshToken: refreshToken! })
      return ok(tokens)
    } catch {
      return unauthorized()
    }
  }

  override buildValidators ({ refreshToken }: RefreshTokenRequest): Validator[] {
    return [
      ...ValidatorBuilder.of({ value: refreshToken, fieldName: 'refreshToken' }).required().build()
    ]
  }
}
