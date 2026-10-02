import { newDb, IMemoryDb, DataType } from 'pg-mem'
import { PgConnection } from '@/infra/repos/postgres/helpers'

export const makeFakeDb = async (entities?: any[]): Promise<IMemoryDb> => {
  const db = newDb()

  db.public.registerFunction({
    name: 'version',
    implementation: () => 'PostgreSQL 14.0 (pg-mem)'
  })

  db.public.registerFunction({
    name: 'current_database',
    implementation: () => 'authkit_db'
  })

  // TypeORM calls obj_description(regclass, text) during synchronize()
  db.public.registerFunction({
    name: 'obj_description',
    args: [DataType.regclass, DataType.text],
    returns: DataType.text,
    implementation: () => null
  })

  // TypeORM calls quote_ident(text) during synchronize()
  db.public.registerFunction({
    name: 'quote_ident',
    args: [DataType.text],
    returns: DataType.text,
    implementation: (value: string) => `"${value}"`
  })

  const dataSource = await db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: entities ?? ['src/infra/repos/postgres/entities/index.ts']
  })
  await dataSource.initialize()
  await dataSource.synchronize()

  // Injected into the singleton: connect() would build a real postgres DataSource
  const pgConnection = PgConnection.getInstance();
  (pgConnection as any).connection = dataSource

  return db
}
