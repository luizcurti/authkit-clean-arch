import { DataSourceOptions } from 'typeorm'

import { env } from '@/main/config/env'

const sourcePath = process.env.TS_NODE_DEV === undefined ? 'dist' : 'src'

export const ormConfig: DataSourceOptions = {
  type: 'postgres',
  host: env.database.host,
  port: env.database.port,
  username: env.database.user,
  password: env.database.password,
  database: env.database.database,
  synchronize: false,
  logging: env.isDevelopment,
  entities: [`${sourcePath}/infra/repos/postgres/entities/index.{ts,js}`],
  migrations: [`${sourcePath}/infra/repos/postgres/migrations/*.{ts,js}`]
}
