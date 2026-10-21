import { AccessToken } from '@/domain/entities'

describe('AccessToken', () => {
  it('Should expire in 900000 ms', () => {
    expect(AccessToken.expirationInMs).toEqual(900000)
  })
})
