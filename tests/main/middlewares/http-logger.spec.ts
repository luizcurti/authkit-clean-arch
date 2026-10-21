import { EventEmitter } from 'events'
import { getMockReq } from '@jest-mock/express'
import { NextFunction, Response } from 'express'
import MockDate from 'mockdate'
import { log } from '@/infra/logger'
import { httpLogger } from '@/main/middlewares/http-logger'

jest.mock('@/infra/logger', () => ({ log: { error: jest.fn(), warn: jest.fn(), http: jest.fn() } }))

describe('httpLogger', () => {
  let next: NextFunction

  beforeEach(() => {
    next = jest.fn()
    MockDate.set('2026-01-01T00:00:00.000Z')
  })

  afterEach(() => {
    MockDate.reset()
  })

  const run = (statusCode: number, req = getMockReq({
    method: 'GET',
    originalUrl: '/api/any',
    ip: '1.2.3.4',
    get: jest.fn().mockReturnValue('any_agent'),
    locals: { requestId: 'any_request_id' }
  })): void => {
    const res = Object.assign(new EventEmitter(), { statusCode }) as unknown as Response
    httpLogger(req, res, next)
    MockDate.set('2026-01-01T00:00:00.042Z')
    res.emit('finish')
  }

  it('should call next right away, logging only once the response finished', () => {
    const res = Object.assign(new EventEmitter(), { statusCode: 200 }) as unknown as Response

    httpLogger(getMockReq(), res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(log.http).not.toHaveBeenCalled()
  })

  it('should log a successful response at http level with the request details', () => {
    run(200)

    expect(log.http).toHaveBeenCalledWith('GET /api/any - 200', {
      method: 'GET',
      url: '/api/any',
      statusCode: 200,
      duration: '42ms',
      ip: '1.2.3.4',
      userAgent: 'any_agent',
      requestId: 'any_request_id'
    })
  })

  it.each([400, 404, 499])('should log a %s response as a warning', (statusCode) => {
    run(statusCode)

    expect(log.warn).toHaveBeenCalledWith(`GET /api/any - ${statusCode}`, expect.objectContaining({ statusCode }))
    expect(log.http).not.toHaveBeenCalled()
  })

  it.each([500, 502])('should log a %s response as an error', (statusCode) => {
    run(statusCode)

    expect(log.error).toHaveBeenCalledWith(`GET /api/any - ${statusCode}`, expect.objectContaining({ statusCode }))
    expect(log.warn).not.toHaveBeenCalled()
  })

  it('should fall back to the socket address and an unknown user agent', () => {
    run(200, getMockReq({
      method: 'POST',
      originalUrl: '/api/login',
      ip: undefined,
      connection: { remoteAddress: '5.6.7.8' },
      get: jest.fn().mockReturnValue(undefined)
    }))

    expect(log.http).toHaveBeenCalledWith('POST /api/login - 200', expect.objectContaining({ ip: '5.6.7.8', userAgent: 'unknown', requestId: undefined }))
  })
})
