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

export class ForbiddenError extends Error {
  constructor () {
    super('Access denied')
    this.name = 'ForbiddenError'
  }
}

export class BadGatewayError extends Error {
  constructor () {
    super('An upstream service failed to respond')
    this.name = 'BadGatewayError'
  }
}
