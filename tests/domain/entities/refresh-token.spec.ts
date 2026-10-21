import { RefreshToken } from '@/domain/entities'

describe('RefreshToken', () => {
  it('Should expire in 604800000 ms', () => {
    expect(RefreshToken.expirationInMs).toEqual(604800000)
  })
})
