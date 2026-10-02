import jwt from 'jsonwebtoken'
import { JwtTokenHandler } from '@/infra/gateways'

jest.mock('jsonwebtoken')

describe('JwtTokenHandler', () => {
  let sut: JwtTokenHandler
  let fakeJwt: jest.Mocked<typeof jwt>
  let secret: string
  let issuer: string
  let audience: string

  beforeAll(() => {
    secret = 'any_secret'
    issuer = 'any_issuer'
    audience = 'any_audience'
    fakeJwt = jwt as jest.Mocked<typeof jwt>
  })

  beforeEach(() => {
    sut = new JwtTokenHandler(secret, { issuer, audience })
  })

  describe('generateToken', () => {
    let key: string
    let expirationInMs: number
    let token: string

    beforeAll(() => {
      key = 'any_key'
      expirationInMs = 1000
      token = 'any_token'
      fakeJwt.sign.mockImplementation(() => token)
    })

    it('should call sign with the key as subject, a pinned algorithm, issuer and audience', async () => {
      await sut.generate({ key, expirationInMs })

      expect(fakeJwt.sign).toHaveBeenCalledWith({}, secret, {
        algorithm: 'HS256',
        subject: key,
        issuer,
        audience,
        expiresIn: 1
      })
      expect(fakeJwt.sign).toHaveBeenCalledTimes(1)
    })

    it('should return a token', async () => {
      const generatedToken = await sut.generate({ key, expirationInMs })

      expect(generatedToken).toBe(token)
    })

    it('Should rethrow if sign throws', async () => {
      fakeJwt.sign.mockImplementationOnce(() => { throw new Error('token_error') })

      const promise = sut.generate({ key, expirationInMs })

      await expect(promise).rejects.toThrow(new Error('token_error'))
    })
  })

  describe('validateToken', () => {
    let token: string
    let key: string

    beforeAll(() => {
      token = 'any_token'
      key = 'any_key'
      fakeJwt.verify.mockImplementation(() => ({ sub: key }))
    })

    it('should call verify restricting algorithm, issuer and audience', async () => {
      await sut.validate({ token })

      expect(fakeJwt.verify).toHaveBeenCalledWith(token, secret, { algorithms: ['HS256'], issuer, audience })
      expect(fakeJwt.verify).toHaveBeenCalledTimes(1)
    })

    it('should return the subject of the token', async () => {
      const subject = await sut.validate({ token })

      expect(subject).toBe(key)
    })

    it('Should throw if the token has no subject', async () => {
      fakeJwt.verify.mockImplementationOnce(() => ({ key }))

      const promise = sut.validate({ token })

      await expect(promise).rejects.toThrow()
    })

    it('Should throw if verify return null', async () => {
      fakeJwt.verify.mockImplementationOnce(() => null)

      const promise = sut.validate({ token })

      await expect(promise).rejects.toThrow()
    })

    it('Should rethrow if verify throws', async () => {
      fakeJwt.verify.mockImplementationOnce(() => { throw new Error('invalid_token') })

      const promise = sut.validate({ token })

      await expect(promise).rejects.toThrow(new Error('invalid_token'))
    })
  })
})
