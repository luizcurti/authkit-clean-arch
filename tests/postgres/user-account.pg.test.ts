import { DataSource } from 'typeorm'
import { PgConnection } from '@/infra/repos/postgres/helpers'
import { PgUserAccountRepository } from '@/infra/repos/postgres'
import { PgUser } from '@/infra/repos/postgres/entities'

// Account identity guarantees that depend on real constraints and ON CONFLICT semantics
describe('User accounts on PostgreSQL', () => {
  const CONCURRENT_LOGINS = 8
  let connection: PgConnection
  let dataSource: DataSource
  let repository: PgUserAccountRepository

  beforeAll(async () => {
    connection = PgConnection.getInstance()
    await connection.connect()
    dataSource = (connection as unknown as { connection: DataSource }).connection
    await dataSource.runMigrations()
    repository = new PgUserAccountRepository()
  })

  afterAll(async () => {
    await connection.disconnect()
  })

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE users RESTART IDENTITY')
  })

  it('concurrent first logins of the same person create exactly one account', async () => {
    const ids = await Promise.all(Array.from({ length: CONCURRENT_LOGINS }, async () =>
      repository.saveWithFacebook({ email: 'same@mail.com', name: 'Same Person', facebookId: 'fb_1' })
    ))

    const users = await dataSource.getRepository(PgUser).find()
    expect(users).toHaveLength(1)
    expect(new Set(ids.map(({ id }) => id))).toEqual(new Set([users[0].id.toString()]))
  })

  it('refuses to re-bind an email that already belongs to another Facebook identity', async () => {
    await dataSource.getRepository(PgUser).save({ email: 'victim@mail.com', facebookId: 'fb_victim' })

    const promise = repository.saveWithFacebook({ email: 'victim@mail.com', name: 'Attacker', facebookId: 'fb_attacker' })

    await expect(promise).rejects.toThrow()
    const [user] = await dataSource.getRepository(PgUser).find()
    expect(user.facebookId).toBe('fb_victim')
  })

  it('concurrent logins of two Facebook identities sharing an email bind the account exactly once', async () => {
    const { id } = await dataSource.getRepository(PgUser).save({ email: 'shared@mail.com', name: 'Owner' })

    const results = await Promise.allSettled(['fb_a', 'fb_b'].map(async facebookId =>
      repository.saveWithFacebook({ id: id.toString(), email: 'shared@mail.com', name: 'Someone', facebookId })
    ))

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(1)
    const [user] = await dataSource.getRepository(PgUser).find()
    expect(['fb_a', 'fb_b']).toContain(user.facebookId)
  })

  it('rejects an email that is not lowercase', async () => {
    const promise = dataSource.getRepository(PgUser).save({ email: 'Mixed@Mail.com' })

    await expect(promise).rejects.toThrow(/CHK_users_email_lowercase/)
  })

  it('rejects a second account with the same Facebook identity', async () => {
    await dataSource.getRepository(PgUser).save({ email: 'a@mail.com', facebookId: 'fb_1' })

    const promise = dataSource.getRepository(PgUser).save({ email: 'b@mail.com', facebookId: 'fb_1' })

    await expect(promise).rejects.toThrow(/duplicate key/)
  })
})
