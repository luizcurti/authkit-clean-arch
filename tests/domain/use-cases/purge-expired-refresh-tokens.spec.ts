import { mock, MockProxy } from 'jest-mock-extended'
import { setupPurgeExpiredRefreshTokens } from '@/domain/use-cases'
import { DeleteExpiredRefreshTokens } from '@/domain/contracts/repositories'

describe('PurgeExpiredRefreshTokens', () => {
  let refreshTokenRepository: MockProxy<DeleteExpiredRefreshTokens>

  beforeAll(() => {
    refreshTokenRepository = mock()
    refreshTokenRepository.deleteExpiredRefreshTokens.mockResolvedValue(3)
  })

  it('Should delete tokens that expired before now and return the count', async () => {
    const before = Date.now()

    const output = await setupPurgeExpiredRefreshTokens(refreshTokenRepository)()

    const { expiredBefore } = refreshTokenRepository.deleteExpiredRefreshTokens.mock.calls[0][0]
    expect(expiredBefore.getTime()).toBeGreaterThanOrEqual(before)
    expect(expiredBefore.getTime()).toBeLessThanOrEqual(Date.now())
    expect(output).toEqual({ deleted: 3 })
  })
})
