import { getMockReq, getMockRes } from '@jest-mock/express'
import { makeOpsAuth } from '@/main/middlewares/ops-auth'

describe('OpsAuthMiddleware', () => {
  const opsToken = 'any_ops_token_with_16_chars'

  const run = (options: Parameters<typeof makeOpsAuth>[0], authorization?: string, locals?: Record<string, unknown>) => {
    const req = getMockReq({ get: jest.fn().mockReturnValue(authorization), locals })
    const { res, next } = getMockRes()
    makeOpsAuth(options)(req, res, next)
    return { res, next }
  }

  it('should let the request through when no token is configured outside production', () => {
    const { next, res } = run({ isProduction: false })

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('should hide the endpoint (404) when no token is configured in production', () => {
    const { next, res } = run({ isProduction: true })

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Not found', requestId: undefined })
  })

  it.each([
    ['the hidden (404) answer', { isProduction: true }, undefined, 404, 'Not found'],
    ['the 401 answer', { opsToken, isProduction: false }, 'Bearer wrong_token', 401, 'unauthorized']
  ])('should include the request id in %s', (_, options, authorization, status, error) => {
    const { res } = run(options, authorization, { requestId: 'any_request_id' })

    expect(res.status).toHaveBeenCalledWith(status)
    expect(res.json).toHaveBeenCalledWith({ error, requestId: 'any_request_id' })
  })

  it('should let the request through with the configured Bearer token', () => {
    const { next } = run({ opsToken, isProduction: true }, `Bearer ${opsToken}`)

    expect(next).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['no authorization header', undefined],
    ['a wrong token', 'Bearer wrong_token'],
    ['the token without the Bearer scheme', opsToken]
  ])('should return 401 with %s', (_, authorization) => {
    const { next, res } = run({ opsToken, isProduction: false }, authorization)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(401)
  })
})
