#!/usr/bin/env node
/**
 * Runs the Postman collection with newman against a running, seeded API. First it signs the access
 * tokens (JWT_* must match the API's), seeds refresh tokens straight into the database (DB_*) and
 * generates the oversized upload.
 * newman is fetched at a pinned version: its dependencies would fail `npm audit` as a devDependency.
 */
require('dotenv/config')
const { spawnSync } = require('child_process')
const { createHash, randomUUID } = require('crypto')
const { mkdirSync, writeFileSync } = require('fs')
const { join } = require('path')
const { sign } = require('jsonwebtoken')
const { Client } = require('pg')

const NEWMAN_VERSION = '6.2.2'
const SEEDED_USER_ID = 1
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const apiDir = join(__dirname, '..', 'docs', 'api')

const jwtSecret = process.env.JWT_SECRET || 'test_secret_key_for_dev_and_tests_only_change_in_prod'
const jwtIssuer = process.env.JWT_ISSUER || 'authkit-clean-arch'
const jwtAudience = process.env.JWT_AUDIENCE || 'authkit-clean-arch-api'

const signAccessToken = ({ subject = String(SEEDED_USER_ID), audience = jwtAudience, expiresIn = 3600 } = {}) =>
  sign({}, jwtSecret, { algorithm: 'HS256', subject, issuer: jwtIssuer, audience, expiresIn })

const newRefreshToken = () => `rt_${randomUUID()}`
const sha256 = value => createHash('sha256').update(value).digest('hex')

// Timestamps from now(): the columns have no time zone, so a local Date would be shifted
const seedRefreshTokens = async () => {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'authkit_db'
  })
  const tokens = {
    refreshToken: newRefreshToken(),
    expiredRefreshToken: newRefreshToken(),
    rotatedRefreshToken: newRefreshToken(),
    rotatedSiblingRefreshToken: newRefreshToken()
  }
  const rotatedFamily = randomUUID()
  const rows = [
    [tokens.refreshToken, randomUUID(), "now() + interval '7 days'", 'NULL'],
    [tokens.expiredRefreshToken, randomUUID(), "now() - interval '1 day'", 'NULL'],
    [tokens.rotatedRefreshToken, rotatedFamily, "now() + interval '7 days'", "now() - interval '1 minute'"],
    [tokens.rotatedSiblingRefreshToken, rotatedFamily, "now() + interval '7 days'", 'NULL']
  ]
  await client.connect()
  try {
    for (const [token, familyId, expiresAt, revokedAt] of rows) {
      await client.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, revoked_at) VALUES ($1, $2, $3, ${expiresAt}, ${revokedAt})`,
        [SEEDED_USER_ID, sha256(token), familyId]
      )
    }
  } finally {
    await client.end()
  }
  return tokens
}

const generateFixtures = () => {
  const dir = join(apiDir, 'fixtures', 'generated')
  mkdirSync(dir, { recursive: true })
  const tooLarge = Buffer.alloc(MAX_UPLOAD_BYTES + 1)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(tooLarge)
  writeFileSync(join(dir, 'too-large.png'), tooLarge)
}

const run = async () => {
  generateFixtures()
  const refreshTokens = await seedRefreshTokens()
  const vars = {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:8080/api',
    accessToken: signAccessToken(),
    expiredAccessToken: signAccessToken({ expiresIn: -60 }),
    otherAudienceAccessToken: signAccessToken({ audience: 'another-api' }),
    unknownUserAccessToken: signAccessToken({ subject: '999999999' }),
    ...refreshTokens
  }
  const args = [
    '--yes', `newman@${NEWMAN_VERSION}`, 'run', join(apiDir, 'collection.postman_collection.json'),
    '--environment', join(apiDir, 'environment.postman_environment.json'),
    '--working-dir', apiDir,
    ...Object.entries(vars).flatMap(([key, value]) => ['--env-var', `${key}=${value}`]),
    '--bail', 'failure'
  ]
  const { status } = spawnSync('npx', args, { stdio: 'inherit' })
  process.exitCode = status ?? 1
}

run().catch(error => {
  console.error('Could not prepare the API collection run:', error.message)
  console.error('Is the stack up and seeded? docker compose up -d && docker compose exec app npm run db:seed')
  process.exitCode = 1
})
