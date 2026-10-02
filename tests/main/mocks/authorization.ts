// Not the gateways barrel, which would load other gateways before a test's jest.mock()
import { JwtTokenHandler } from '@/infra/gateways/jwt-token'
import { env } from '@/main/config/env'

export const makeAuthorization = async (userId: string | number, expirationInMs = 60 * 1000): Promise<string> => {
  const handler = new JwtTokenHandler(env.jwt.secret, { issuer: env.jwt.issuer, audience: env.jwt.audience })
  const token = await handler.generate({ key: userId.toString(), expirationInMs })
  return `Bearer ${token}`
}
