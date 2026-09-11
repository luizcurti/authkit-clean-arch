import { mapError } from '@/application/helpers'
import { BadGatewayError, ServerError } from '@/application/errors'
import { ExternalServiceError } from '@/domain/entities/errors'

describe('mapError', () => {
  it('should map ExternalServiceError to 502 BadGatewayError', () => {
    const httpResponse = mapError(new ExternalServiceError())

    expect(httpResponse).toEqual({
      statusCode: 502,
      data: new BadGatewayError()
    })
  })

  it('should map any other error to 500 ServerError', () => {
    const error = new Error('any_error')

    const httpResponse = mapError(error)

    expect(httpResponse).toEqual({
      statusCode: 500,
      data: new ServerError(error)
    })
  })

  it('should map a non Error throwable to 500 ServerError', () => {
    const httpResponse = mapError('any_error')

    expect(httpResponse).toEqual({
      statusCode: 500,
      data: new ServerError()
    })
  })
})
