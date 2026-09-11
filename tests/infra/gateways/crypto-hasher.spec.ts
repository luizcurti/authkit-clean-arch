import { createHash } from 'crypto'
import { CryptoHasher } from '@/infra/gateways'

describe('CryptoHasher', () => {
  let sut: CryptoHasher

  beforeEach(() => {
    sut = new CryptoHasher()
  })

  it('Should return the sha256 hex digest of the input', async () => {
    const hash = await sut.hash('any_value')

    expect(hash).toBe(createHash('sha256').update('any_value').digest('hex'))
  })

  it('Should return different hashes for different inputs', async () => {
    const hash1 = await sut.hash('value_one')
    const hash2 = await sut.hash('value_two')

    expect(hash1).not.toBe(hash2)
  })

  it('Should return the same hash for the same input', async () => {
    const hash1 = await sut.hash('same_value')
    const hash2 = await sut.hash('same_value')

    expect(hash1).toBe(hash2)
  })
})
