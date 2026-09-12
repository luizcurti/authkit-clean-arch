import { HttpResponse, serverError, badGateway } from '@/application/helpers/http'
import { ExternalServiceError } from '@/domain/entities/errors'

export const mapError = (error: unknown): HttpResponse => {
  if (error instanceof ExternalServiceError) {
    return badGateway()
  }
  return serverError(error)
}
