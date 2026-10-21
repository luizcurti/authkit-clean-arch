import { env } from '@/main/config/env'
import { JwtTokenHandler } from '@/infra/gateways'

export const makeJwtTokenHandler = (): JwtTokenHandler => {
  return new JwtTokenHandler(env.jwt.secret, { issuer: env.jwt.issuer, audience: env.jwt.audience })
}
