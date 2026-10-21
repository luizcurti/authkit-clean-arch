import { PgOutboxRepository } from '@/infra/repos/postgres'
import { makePgOutboxRepository } from '@/main/factories/infra/repos/postgres'

const loadFactories = () => {
  const setupProcessOutboxEvents = jest.fn().mockReturnValue('process_outbox_events')
  const setupPurgeExpiredRefreshTokens = jest.fn().mockReturnValue('purge_expired_refresh_tokens')
  let factories!: typeof import('@/main/factories/domain/use-cases')
  let repos!: typeof import('@/infra/repos/postgres')
  let gateways!: typeof import('@/infra/gateways')
  jest.isolateModules(() => {
    jest.doMock('@/domain/use-cases', () => ({
      ...jest.requireActual('@/domain/use-cases'),
      setupProcessOutboxEvents,
      setupPurgeExpiredRefreshTokens
    }))
    factories = require('@/main/factories/domain/use-cases')
    repos = require('@/infra/repos/postgres')
    gateways = require('@/infra/gateways')
  })
  return { factories, repos, gateways, setupProcessOutboxEvents, setupPurgeExpiredRefreshTokens }
}

describe('Background job factories', () => {
  it('should make a PgOutboxRepository', () => {
    expect(makePgOutboxRepository()).toBeInstanceOf(PgOutboxRepository)
  })

  it('should wire ProcessOutboxEvents to the outbox repository and the S3 file storage', () => {
    const { factories, repos, gateways, setupProcessOutboxEvents } = loadFactories()

    const sut = factories.makeProcessOutboxEvents()

    expect(sut).toBe('process_outbox_events')
    expect(setupProcessOutboxEvents).toHaveBeenCalledWith(expect.any(repos.PgOutboxRepository), expect.any(gateways.AwsS3FileStorage))
  })

  it('should wire PurgeExpiredRefreshTokens to the refresh token repository', () => {
    const { factories, repos, setupPurgeExpiredRefreshTokens } = loadFactories()

    const sut = factories.makePurgeExpiredRefreshTokens()

    expect(sut).toBe('purge_expired_refresh_tokens')
    expect(setupPurgeExpiredRefreshTokens).toHaveBeenCalledWith(expect.any(repos.PgRefreshTokenRepository))
  })
})
