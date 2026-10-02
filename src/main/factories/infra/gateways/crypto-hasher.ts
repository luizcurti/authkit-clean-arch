import { CryptoHasher } from '@/infra/gateways'

export const makeCryptoHasher = (): CryptoHasher => {
  return new CryptoHasher()
}
