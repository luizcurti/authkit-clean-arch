import { createHash } from 'crypto'
import { Hasher } from '@/domain/contracts/gateways'

export class CryptoHasher implements Hasher {
  async hash (input: Hasher.Input): Promise<Hasher.Output> {
    return createHash('sha256').update(input).digest('hex')
  }
}
