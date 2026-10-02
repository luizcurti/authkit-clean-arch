import { NextFunction, Request, RequestHandler, Response } from 'express'
import { mock, MockProxy } from 'jest-mock-extended'
import { Middleware } from '@/application/middlewares'
import { adaptExpressMiddleware, errorMessage } from '@/main/adapters'
import { getMockReq, getMockRes } from '@jest-mock/express'

describe('ExpressMiddleware', () => {
  let req: Request
  let res: Response
  let next: NextFunction
  let middleware: MockProxy<Middleware>
  let sut: RequestHandler

  beforeAll(() => {
    req = getMockReq({ headers: { any: 'any' } })
    res = getMockRes().res
    next = getMockRes().next
    middleware = mock<Middleware>()
    middleware.handle.mockResolvedValue({
      statusCode: 200,
      data: {
        emptyProp: '',
        nullProp: null,
        undefinedProp: undefined,
        prop: 'any_value'
      }
    })
  })

  beforeEach(() => {
    sut = adaptExpressMiddleware(middleware)
  })

  it('should call handle with correct request', async () => {
    await sut(req, res, next)

    expect(middleware.handle).toHaveBeenCalledWith({ any: 'any' })
    expect(middleware.handle).toHaveBeenCalledTimes(1)
  })

  it('should call handle with empty request', async () => {
    const req = getMockReq({})

    await sut(req, res, next)

    expect(middleware.handle).toHaveBeenCalledWith({})
    expect(middleware.handle).toHaveBeenCalledTimes(1)
  })

  it('should respond with correct error and statusCode', async () => {
    middleware.handle.mockResolvedValueOnce({
      statusCode: 500,
      data: new Error('any_error')
    })

    await sut(req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.json).toHaveBeenCalledWith({ error: 'any_error', requestId: undefined })
    expect(res.json).toHaveBeenCalledTimes(1)
  })

  it('should send the response headers along with an error', async () => {
    middleware.handle.mockResolvedValueOnce({
      statusCode: 401,
      data: new Error('unauthorized'),
      headers: { 'WWW-Authenticate': 'Bearer' }
    })

    await sut(req, res, next)

    expect(res.set).toHaveBeenCalledWith({ 'WWW-Authenticate': 'Bearer' })
    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('should add valid to req.locals', async () => {
    await sut(req, res, next)

    expect(req.locals).toEqual({ prop: 'any_value' })
    expect(next).toHaveBeenCalledTimes(1)
  })
})

describe('errorMessage', () => {
  it('should return the message of an Error', () => {
    expect(errorMessage(new Error('any_message'))).toBe('any_message')
  })

  it.each([
    ['a string', 'any_string'],
    ['null', null],
    ['an object', { message: 'not an Error' }]
  ])('should return a generic message for %s', (_, data) => {
    expect(errorMessage(data)).toBe('Unknown error')
  })
})
