import { DataSource } from 'typeorm'
import { PgConnection } from '@/infra/repos/postgres/helpers'
import { PgRefreshTokenRepository } from '@/infra/repos/postgres'
import { PgRefreshToken } from '@/infra/repos/postgres/entities'
import { CryptoHasher, UUIDHandler } from '@/infra/gateways'
import { JwtTokenHandler } from '@/infra/gateways/jwt-token'
import { setupRefreshAccessToken } from '@/domain/use-cases'
import { AuthenticationError } from '@/domain/entities/errors'
import { RefreshToken } from '@/domain/entities'

// Rotation races need real row locks, which pg-mem lacks
describe('Refresh token rotation on PostgreSQL', () => {
  const CONCURRENT_REQUESTS = 8
  let connection: PgConnection
  let dataSource: DataSource
  let repository: PgRefreshTokenRepository
  let hasher: CryptoHasher

  beforeAll(async () => {
    connection = PgConnection.getInstance()
    await connection.connect()
    dataSource = (connection as unknown as { connection: DataSource }).connection
    await dataSource.runMigrations()
    repository = new PgRefreshTokenRepository()
    hasher = new CryptoHasher()
  })

  afterAll(async () => {
    await connection.disconnect()
  })

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE refresh_tokens RESTART IDENTITY')
  })

  const saveToken = async (refreshToken: string, familyId: string): Promise<void> => {
    await repository.saveRefreshToken({
      userId: '1',
      tokenHash: await hasher.hash(refreshToken),
      expiresAt: new Date(Date.now() + RefreshToken.expirationInMs),
      familyId
    })
  }

  it('revokeRefreshToken returns true for exactly one of many concurrent calls on the same token', async () => {
    await saveToken('rt_race', 'family_race')
    const stored = await repository.loadByHash({ tokenHash: await hasher.hash('rt_race') })

    const results = await Promise.all(
      Array.from({ length: CONCURRENT_REQUESTS }, async () => repository.revokeRefreshToken({ id: stored!.id }))
    )

    expect(results.filter(Boolean)).toHaveLength(1)
  })

  it('concurrent rotations of the same refresh token issue exactly one new token pair', async () => {
    await saveToken('rt_original', 'family_1')
    const refreshAccessToken = setupRefreshAccessToken(
      repository,
      hasher,
      new JwtTokenHandler('any_secret_for_pg_tests', { issuer: 'tests', audience: 'tests' }),
      new UUIDHandler()
    )

    const outcomes = await Promise.allSettled(
      Array.from({ length: CONCURRENT_REQUESTS }, async () => refreshAccessToken({ refreshToken: 'rt_original' }))
    )

    const fulfilled = outcomes.filter(outcome => outcome.status === 'fulfilled')
    const rejected = outcomes.filter((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected')
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(CONCURRENT_REQUESTS - 1)
    rejected.forEach(({ reason }) => expect(reason).toBeInstanceOf(AuthenticationError))

    // Losing the race is a concurrent refresh, not reuse: the family stays valid
    const tokens = await dataSource.getRepository(PgRefreshToken).find({ where: { familyId: 'family_1' } })
    expect(tokens).toHaveLength(2)
    expect(tokens.filter(token => token.revokedAt === null)).toHaveLength(1)
  })

  describe('inside a transaction (as POST /login/refresh runs)', () => {
    const makeRefreshAccessToken = (repo: PgRefreshTokenRepository) => setupRefreshAccessToken(
      repo,
      hasher,
      new JwtTokenHandler('any_secret_for_pg_tests', { issuer: 'tests', audience: 'tests' }),
      new UUIDHandler()
    )

    it('rolls back the revocation when saving the new token fails, so the old token still works', async () => {
      await saveToken('rt_original', 'family_tx')
      const failingRepository = new PgRefreshTokenRepository()
      failingRepository.saveRefreshToken = async () => { throw new Error('insert failed') }

      const failed = connection.transaction(async () => makeRefreshAccessToken(failingRepository)({ refreshToken: 'rt_original' }))
      await expect(failed).rejects.toThrow('insert failed')

      const retried = await connection.transaction(async () => makeRefreshAccessToken(repository)({ refreshToken: 'rt_original' }))
      expect(retried.refreshToken).toEqual(expect.any(String))
    })

    it('concurrent rotations, each in its own transaction, still issue exactly one new token pair', async () => {
      await saveToken('rt_original', 'family_tx_race')
      const refreshAccessToken = makeRefreshAccessToken(repository)

      const outcomes = await Promise.allSettled(Array.from({ length: CONCURRENT_REQUESTS }, async () =>
        connection.transaction(async () => refreshAccessToken({ refreshToken: 'rt_original' }))
      ))

      expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(1)
      const tokens = await dataSource.getRepository(PgRefreshToken).find({ where: { familyId: 'family_tx_race' } })
      expect(tokens).toHaveLength(2)
    })
  })
})
