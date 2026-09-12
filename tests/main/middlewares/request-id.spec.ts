import { getMockReq, getMockRes } from '@jest-mock/express'
import { requestId, REQUEST_ID_HEADER } from '@/main/middlewares/request-id'

describe('RequestIdMiddleware', () => {
  it('should generate a new request id when no header is provided', () => {
    const req = getMockReq()
    const { res, next } = getMockRes()

    requestId(req, res, next)

    expect(req.locals.requestId).toEqual(expect.any(String))
    expect(req.locals.requestId.length).toBeGreaterThan(0)
    expect(res.set).toHaveBeenCalledWith(REQUEST_ID_HEADER, req.locals.requestId)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('should reuse the incoming x-request-id header when present', () => {
    const req = getMockReq({ get: jest.fn().mockReturnValue('incoming_id') })
    const { res, next } = getMockRes()

    requestId(req, res, next)

    expect(req.locals.requestId).toBe('incoming_id')
    expect(res.set).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'incoming_id')
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('should generate a new id when the incoming header is blank', () => {
    const req = getMockReq({ get: jest.fn().mockReturnValue('   ') })
    const { res, next } = getMockRes()

    requestId(req, res, next)

    expect(req.locals.requestId).not.toBe('   ')
    expect(req.locals.requestId.length).toBeGreaterThan(0)
  })

  it('should preserve existing req.locals fields', () => {
    const req = getMockReq({ locals: { userId: 'any_user_id' } })
    const { res, next } = getMockRes()

    requestId(req, res, next)

    expect(req.locals).toEqual({
      userId: 'any_user_id',
      requestId: expect.any(String)
    })
  })
})
