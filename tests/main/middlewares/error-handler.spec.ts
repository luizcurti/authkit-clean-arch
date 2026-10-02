import { getMockReq, getMockRes } from '@jest-mock/express'
import { errorHandler } from '@/main/middlewares/error-handler'

describe('errorHandler', () => {
  const run = (error: Error & { status?: number, type?: string }) => {
    const req = getMockReq({ locals: { requestId: 'any_request_id' } })
    const { res, next } = getMockRes()
    errorHandler(error, req, res, next)
    return res
  }

  it('should keep the status of a client error and answer with a fixed message', () => {
    const res = run(Object.assign(new Error('Unexpected end of JSON input'), { status: 400, type: 'entity.parse.failed' }))

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Malformed JSON body', requestId: 'any_request_id' })
  })

  it('should not echo the message of an unknown client error', () => {
    const res = run(Object.assign(new Error('internal detail'), { status: 415, type: 'charset.unsupported' }))

    expect(res.status).toHaveBeenCalledWith(415)
    expect(res.json).toHaveBeenCalledWith({ error: 'Bad request', requestId: 'any_request_id' })
  })

  it('should answer a client error without a type with the generic message', () => {
    const res = run(Object.assign(new Error('internal detail'), { status: 404 }))

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Bad request', requestId: 'any_request_id' })
  })

  it.each([
    ['a status of 500 or more', 503],
    ['a status below 400', 302]
  ])('should treat an error with %s as a server error', (_, status) => {
    const res = run(Object.assign(new Error('any'), { status }))

    expect(res.status).toHaveBeenCalledWith(500)
  })

  it('should answer without a request id when the request has none', () => {
    const { res, next } = getMockRes()

    errorHandler(new Error('any'), getMockReq(), res, next)

    expect(res.json).toHaveBeenCalledWith({ error: 'Server failed. Try again later', requestId: undefined })
  })

  it('should turn anything else into a generic 500 without leaking the error', () => {
    const res = run(new Error('db password is wrong'))

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'Server failed. Try again later', requestId: 'any_request_id' })
  })
})
