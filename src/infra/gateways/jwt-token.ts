import { JwtPayload, sign, verify } from 'jsonwebtoken'
import { TokenGenerator, TokenValidator } from '@/domain/contracts/gateways'

type JwtOptions = {
  issuer: string
  audience: string
}

const ALGORITHM = 'HS256'

export class JwtTokenHandler implements TokenGenerator, TokenValidator {
  constructor (
    private readonly secret: string,
    private readonly options: JwtOptions
  ) { }

  async generate ({ expirationInMs, key }: TokenGenerator.Input): Promise<TokenGenerator.Output> {
    const expirationInSeconds = expirationInMs / 1000
    return sign({}, this.secret, {
      algorithm: ALGORITHM,
      subject: key,
      issuer: this.options.issuer,
      audience: this.options.audience,
      expiresIn: expirationInSeconds
    })
  }

  // Pinned algorithm, issuer and audience: tokens for another service sharing the secret are rejected
  async validate ({ token }: TokenValidator.Input): Promise<TokenValidator.Output> {
    const payload = verify(token, this.secret, {
      algorithms: [ALGORITHM],
      issuer: this.options.issuer,
      audience: this.options.audience
    }) as JwtPayload
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) {
      throw new Error('Token has no subject')
    }
    return payload.sub
  }
}
