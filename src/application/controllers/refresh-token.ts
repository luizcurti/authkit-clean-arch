import { HttpResponse, unauthorized, ok } from '@/application/helpers'
import { Validator, ValidatorBuilder } from '@/application/validation'
import { Controller } from '@/application/controllers'
import { RefreshAccessToken } from '@/domain/use-cases'
import { AuthenticationError } from '@/domain/entities/errors'
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
    } catch (error) {
      // Anything else is a 500, which rolls the rotation back
      if (error instanceof AuthenticationError) return unauthorized()
      throw error
    }
  }

  override buildValidators ({ refreshToken }: RefreshTokenRequest): Validator[] {
    return [
      ...ValidatorBuilder.of({ value: refreshToken, fieldName: 'refreshToken' }).required().string().build()
    ]
  }
}
