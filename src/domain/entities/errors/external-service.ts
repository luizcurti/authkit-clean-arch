export class ExternalServiceError extends Error {
  constructor (cause?: Error) {
    super('External service is currently unavailable')
    this.name = 'ExternalServiceError'
    this.cause = cause
  }
}
