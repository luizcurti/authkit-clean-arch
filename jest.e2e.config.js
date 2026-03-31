/** @type {import('jest').Config} */
module.exports = {
  testTimeout: 30000,
  moduleNameMapper: {
    '@/tests/(.+)': '<rootDir>/tests/$1',
    '@/(.+)': '<rootDir>/src/$1'
  },
  testMatch: [
    '<rootDir>/tests/main/routes/**/*.spec.ts'
  ],
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],
  transform: {
    '\\.ts$': 'ts-jest'
  },
  clearMocks: true,
  runInBand: true
}
