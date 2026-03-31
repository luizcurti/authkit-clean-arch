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
    implementation: () => 'nodejs_tdd_db'
  })

  // TypeORM 0.3 calls obj_description(regclass, text) during synchronize()
  db.public.registerFunction({
    name: 'obj_description',
    args: [DataType.regclass, DataType.text],
    returns: DataType.text,
    implementation: () => null
  })
  
  const dataSource = await db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: entities ?? ['src/infra/repos/postgres/entities/index.ts']
  })
  await dataSource.initialize()
  await dataSource.synchronize()

  // Inject the pg-mem DataSource into PgConnection singleton
  // (PgConnection uses the legacy TypeORM 0.2 global API which pg-mem doesn't register with)
  const pgConnection = PgConnection.getInstance();
  (pgConnection as any).connection = dataSource

  return db
}
