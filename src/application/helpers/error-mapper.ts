import { HttpResponse, serverError, badGateway, conflict, notFound } from '@/application/helpers/http'
import { ConcurrentModificationError, ExternalServiceError, UserNotFoundError } from '@/domain/entities/errors'

export const mapError = (error: unknown): HttpResponse<Error> => {
  if (error instanceof ExternalServiceError) {
    return badGateway()
  }
  if (error instanceof UserNotFoundError) {
    return notFound('User')
  }
  if (error instanceof ConcurrentModificationError) {
    return conflict()
  }
  return serverError(error)
}
