import { DataSource } from 'typeorm'
import { PgConnection } from '@/infra/repos/postgres/helpers'

// Every migration applies, reverts and applies again, matching the entities
describe('Migrations on PostgreSQL', () => {
  let connection: PgConnection
  let dataSource: DataSource

  const tables = async (): Promise<string[]> => {
    const rows: Array<{ tablename: string }> = await dataSource.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename")
    return rows.map(row => row.tablename)
  }

  beforeAll(async () => {
    connection = PgConnection.getInstance()
    await connection.connect()
    dataSource = (connection as unknown as { connection: DataSource }).connection
    await dataSource.runMigrations()
  })

  afterAll(async () => {
    // Other suites need the migrated schema
    await dataSource.runMigrations()
    await connection.disconnect()
  })

  it('reverts every migration down to an empty schema, then applies them all again', async () => {
    const migrated = await tables()

    for (let i = 0; i < dataSource.migrations.length; i++) await dataSource.undoLastMigration()
    const reverted = await tables()
    const applied = await dataSource.runMigrations()

    expect(migrated).toEqual(expect.arrayContaining(['migrations', 'outbox_events', 'refresh_tokens', 'users']))
    expect(reverted).toEqual(['migrations'])
    expect(applied).toHaveLength(dataSource.migrations.length)
    expect(await tables()).toEqual(migrated)
  })

  it('leaves no difference between the migrated schema and the entities', async () => {
    const sqlInMemory = await dataSource.driver.createSchemaBuilder().log()

    expect(sqlInMemory.upQueries.map(query => query.query)).toEqual([])
  })
})
