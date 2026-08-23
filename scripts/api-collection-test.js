#!/usr/bin/env node
/**
 * Zero-dependency API contract test runner.
 * Exercises the same requests documented in docs/api/collection.postman_collection.json
 * against a running instance of the API (e.g. the docker-compose stack).
 *
 * Assumes the database was seeded with dump.sql (user id=1, name "Loro").
 */
require('dotenv/config')
const { sign } = require('jsonwebtoken')

const baseUrl = process.env.API_BASE_URL || 'http://localhost:8080/api'
const jwtSecret = process.env.JWT_SECRET || 'test_secret_key_for_dev_and_tests_only_change_in_prod'
const accessToken = sign({ key: '1' }, jwtSecret, { expiresIn: 3600 })

const cases = [
  {
    name: 'GET /health returns 200 with status ok',
    request: () => fetch(`${baseUrl}/health`),
    expectedStatus: 200,
    assert: body => body.status === 'ok'
  },
  {
    name: 'GET /health/detailed returns 200 with database up',
    request: () => fetch(`${baseUrl}/health/detailed`),
    expectedStatus: 200,
    assert: body => body.checks?.database?.status === 'up'
  },
  {
    name: 'POST /login/facebook with missing token returns 400 validation error',
    request: () => fetch(`${baseUrl}/login/facebook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    }),
    expectedStatus: 400,
    assert: body => typeof body.error === 'string'
  },
  {
    name: 'POST /login/facebook with invalid token returns 401',
    request: () => fetch(`${baseUrl}/login/facebook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalid_token' })
    }),
    expectedStatus: 401
  },
  {
    name: 'GET unknown route returns 404',
    request: () => fetch(`${baseUrl}/this-route-does-not-exist`),
    expectedStatus: 404
  },
  {
    name: 'DELETE /users/picture without auth header returns 403',
    request: () => fetch(`${baseUrl}/users/picture`, { method: 'DELETE' }),
    expectedStatus: 403
  },
  {
    name: 'DELETE /users/picture with invalid auth header returns 403',
    request: () => fetch(`${baseUrl}/users/picture`, {
      method: 'DELETE',
      headers: { Authorization: 'invalid_token' }
    }),
    expectedStatus: 403
  },
  {
    name: 'DELETE /users/picture with a valid Bearer token returns 200',
    request: () => fetch(`${baseUrl}/users/picture`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    }),
    expectedStatus: 200,
    assert: body => body.initials === 'L'
  },
  {
    name: 'PUT /users/picture without auth header returns 403',
    request: () => fetch(`${baseUrl}/users/picture`, { method: 'PUT' }),
    expectedStatus: 403
  },
  {
    name: 'PUT /users/picture with a valid token but no file returns 400',
    request: () => fetch(`${baseUrl}/users/picture`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` }
    }),
    expectedStatus: 400,
    assert: body => typeof body.error === 'string'
  },
  {
    name: 'PUT /users/picture with an unsupported mime type returns 400',
    request: () => {
      const formData = new FormData()
      formData.append('picture', new Blob(['not-a-real-image'], { type: 'image/gif' }), 'pic.gif')
      return fetch(`${baseUrl}/users/picture`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData
      })
    },
    expectedStatus: 400,
    assert: body => typeof body.error === 'string'
  }
]

const run = async () => {
  let failures = 0

  for (const testCase of cases) {
    const response = await testCase.request()
    const contentType = response.headers.get('content-type') ?? ''
    const body = contentType.includes('application/json') ? await response.json() : await response.text()

    const statusOk = response.status === testCase.expectedStatus
    const assertOk = testCase.assert === undefined || testCase.assert(body)

    if (statusOk && assertOk) {
      console.log(`PASS: ${testCase.name}`)
    } else {
      failures++
      console.error(`FAIL: ${testCase.name}`)
      console.error(`  expected status ${testCase.expectedStatus}, got ${response.status}`)
      console.error(`  body: ${JSON.stringify(body)}`)
    }
  }

  console.log(`\n${cases.length - failures}/${cases.length} checks passed`)
  if (failures > 0) process.exit(1)
}

run().catch(err => {
  console.error('API collection test run crashed:', err)
  process.exit(1)
})
