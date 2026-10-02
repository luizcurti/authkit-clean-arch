/**
 * Real PostgreSQL (DB_* env vars) in its own database (PG_TEST_DATABASE, default authkit_test)
 * @type {import('jest').Config}
 */
module.exports = {
  testTimeout: 30000,
  moduleNameMapper: {
    '@/tests/(.+)': '<rootDir>/tests/$1',
    '@/(.+)': '<rootDir>/src/$1'
  },
  testMatch: ['<rootDir>/tests/postgres/**/*.pg.test.ts'],
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],
  transform: {
    '\\.ts$': 'ts-jest'
  },
  clearMocks: true,
  globalSetup: '<rootDir>/tests/postgres/global-setup.js',
  setupFiles: ['<rootDir>/tests/postgres/env.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
}
