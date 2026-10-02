// The suite truncates tables, so it uses its own database, created when missing
const { Client } = require('pg')

module.exports = async () => {
  const database = process.env.PG_TEST_DATABASE || 'authkit_test'
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres'
  })
  await client.connect()
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database])
    if (rowCount === 0) await client.query(`CREATE DATABASE "${database}"`)
  } finally {
    await client.end()
  }
}
