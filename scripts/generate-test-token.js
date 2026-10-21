#!/usr/bin/env node
/**
 * Prints an access token for a user id, signed like the API's (same JWT_SECRET required).
 *
 *   node scripts/generate-test-token.js [userId]
 */
require('dotenv/config')
const { sign } = require('jsonwebtoken')

const secret = process.env.JWT_SECRET || 'test_secret_key_for_dev_and_tests_only_change_in_prod'
const userId = process.argv[2] || '1'

console.log(sign({}, secret, {
  algorithm: 'HS256',
  subject: userId,
  issuer: process.env.JWT_ISSUER || 'authkit-clean-arch',
  audience: process.env.JWT_AUDIENCE || 'authkit-clean-arch-api',
  expiresIn: 3600
}))
