module.exports = {
  testTimeout: 10000,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.ts',
    '!<rootDir>/src/infra/logger/winston-logger.ts',
    '!<rootDir>/src/main/**',
    '!<rootDir>/src/**/index.ts',
    '!<rootDir>/src/main/config/**',
    '!<rootDir>/src/main/factories/**',
    '!<rootDir>/src/main/routes/**',
    '!<rootDir>/src/main/adapters/**',
    '!<rootDir>/src/main/middlewares/**',
    '!<rootDir>/src/main/types/**',
    '!<rootDir>/src/infra/gateways/aws-s3-file-storage.ts',
    '!<rootDir>/src/infra/repos/postgres/helpers/connection.ts',
    '!<rootDir>/src/infra/repos/postgres/entities/user.ts',
    '!<rootDir>/src/infra/repos/postgres/user-account.ts',
    '!<rootDir>/src/infra/repos/postgres/user-profile.ts',
    '!<rootDir>/src/application/contracts/**',
    '!<rootDir>/src/domain/contracts/**'
  ],
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageReporters: ['text', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapper: {
    '@/tests/(.+)': '<rootDir>/tests/$1',
    '@/(.+)': '<rootDir>/src/$1'
  },
  testMatch: ['**/*.spec.ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    'aws-s3-file-storage.spec.ts',
    'multer.spec.ts',
    'connection.spec.ts',
    'user-account.spec.ts',
    'infra/repos/user-profile.spec.ts'
  ],
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests'
  ],
  transform: {
    '\\.ts$': 'ts-jest'
  },
  clearMocks: true
  // setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
}
