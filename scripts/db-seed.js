#!/usr/bin/env node
/**
 * Idempotent seed for local/dev/CI environments.
 * Seeds the fixture user (id=1, name "Loro") that scripts/api-collection-test.js
 * and the Postman collection rely on.
 */
require('dotenv/config')
const { Client } = require('pg')

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'nodejs_tdd_db'
})

async function seed () {
  await client.connect()

  await client.query(`
    INSERT INTO users (id, name, email, facebook_id)
    VALUES (1, 'Loro', 'loro@mail.com', '123456789')
    ON CONFLICT (id) DO NOTHING
  `)

  await client.query(`
    SELECT setval(pg_get_serial_sequence('users', 'id'), GREATEST((SELECT MAX(id) FROM users), 1))
  `)

  console.log('Seed complete')
}

seed()
  .catch((err) => {
    console.error('Seed failed', err)
    process.exitCode = 1
  })
  .finally(() => client.end())
