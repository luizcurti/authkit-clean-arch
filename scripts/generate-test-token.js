#!/usr/bin/env node
require('dotenv/config')
const { sign } = require('jsonwebtoken')

const secret = process.env.JWT_SECRET || 'test_secret_key_for_dev_and_tests_only_change_in_prod'
const key = process.argv[2] || '1'

console.log(sign({ key }, secret, { expiresIn: 3600 }))
