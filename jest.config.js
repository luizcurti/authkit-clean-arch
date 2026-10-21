module.exports = {
  testTimeout: 10000,
  // Excludes barrels, type-only modules and migrations (run by test:pg)
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/*/*/**/index.ts',
    '!<rootDir>/src/**/*.d.ts',
    '!<rootDir>/src/application/contracts/**',
    '!<rootDir>/src/domain/contracts/**',
    '!<rootDir>/src/infra/repos/postgres/migrations/**'
  ],
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageReporters: ['text', 'html', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  moduleNameMapper: {
    '@/tests/(.+)': '<rootDir>/tests/$1',
    '@/(.+)': '<rootDir>/src/$1'
  },
  testMatch: ['**/*.spec.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],
  transform: {
    '\\.ts$': 'ts-jest'
  },
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
}
