import { newDb, IMemoryDb } from 'pg-mem'
import { PgConnection } from '@/infra/repos/postgres/helpers'

export const makeFakeDb = async (entities?: any[]): Promise<IMemoryDb> => {
  const db = newDb()
  
  // Register version function that TypeORM 0.3 expects
  db.public.registerFunction({
    name: 'version',
    implementation: () => 'PostgreSQL 14.0 (pg-mem)'
  })
  
  const dataSource = await db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: entities ?? ['src/infra/repos/postgres/entities/index.ts']
  })
  await dataSource.initialize()
  await dataSource.synchronize()
  await PgConnection.getInstance().connect()
  return db
}
