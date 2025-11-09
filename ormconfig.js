const { env } = require('./dist/main/config/env')

module.exports = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'nodejs_tdd_db',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [
    `${process.env.TS_NODE_DEV === undefined ? 'dist' : 'src'}/infra/repos/postgres/entities/index.{ts,js}`
  ],
  migrations: [
    `${process.env.TS_NODE_DEV === undefined ? 'dist' : 'src'}/infra/repos/postgres/migrations/*.{ts,js}`
  ],
  cli: {
    entitiesDir: 'src/infra/repos/postgres/entities',
    migrationsDir: 'src/infra/repos/postgres/migrations'
  }
}
