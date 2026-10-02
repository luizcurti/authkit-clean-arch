export class ServerError extends Error {
  constructor (error?: Error) {
    super('Server failed. Try again later')
    this.name = 'ServerError'
    this.stack = error?.stack || this.stack
  }
}

export class UnauthorizedError extends Error {
  constructor () {
    super('unauthorized')
    this.name = 'UnauthorizedError'
  }
}

export class BadGatewayError extends Error {
  constructor () {
    super('An upstream service failed to respond')
    this.name = 'BadGatewayError'
  }
}

export class NotFoundError extends Error {
  constructor (resource: string) {
    super(`${resource} not found`)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  constructor () {
    super('The resource was modified by another request. Retry')
    this.name = 'ConflictError'
  }
}
