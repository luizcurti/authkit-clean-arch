import { extname, join } from 'path'
import { DataSourceOptions } from 'typeorm'

import { env } from '@/main/config/env'

// Relative to this file, so it works from src/ (*.ts) and dist/ (*.js)
const postgresDir = join(__dirname, '..', '..', 'infra', 'repos', 'postgres')
const ext = extname(__filename)

export const ormConfig: DataSourceOptions = {
  type: 'postgres',
  host: env.database.host,
  port: env.database.port,
  username: env.database.user,
  password: env.database.password,
  database: env.database.database,
  synchronize: false,
  logging: env.isDevelopment,
  entities: [join(postgresDir, 'entities', `index${ext}`)],
  migrations: [join(postgresDir, 'migrations', `*${ext}`)]
}
