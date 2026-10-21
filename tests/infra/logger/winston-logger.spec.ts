import { formatConsoleLine } from '@/infra/logger/winston-logger'

type Env = { isDevelopment: boolean, isProduction: boolean, isTest: boolean }

// The logger is configured on load, so each case loads it in isolation against a recording winston
const loadLogger = (env: Env, logLevel?: string) => {
  const previousLogLevel = process.env.LOG_LEVEL
  if (logLevel === undefined) delete process.env.LOG_LEVEL
  else process.env.LOG_LEVEL = logLevel
  const logger = { error: jest.fn(), warn: jest.fn(), info: jest.fn(), http: jest.fn(), debug: jest.fn() }
  const Console = jest.fn()
  const createLogger = jest.fn().mockReturnValue(logger)
  const format = Object.assign(jest.fn(), {
    combine: jest.fn((...formats: unknown[]) => ({ combine: formats })),
    timestamp: jest.fn(() => 'timestamp'),
    errors: jest.fn(() => 'errors'),
    metadata: jest.fn(() => 'metadata'),
    colorize: jest.fn(() => 'colorize'),
    printf: jest.fn(() => 'printf'),
    json: jest.fn(() => 'json')
  })
  let log!: typeof import('@/infra/logger/winston-logger').log
  jest.isolateModules(() => {
    jest.doMock('winston', () => ({ __esModule: true, default: { format, transports: { Console }, createLogger } }))
    jest.doMock('@/main/config/env', () => ({ env }))
    log = require('@/infra/logger/winston-logger').log
  })
  if (previousLogLevel === undefined) delete process.env.LOG_LEVEL
  else process.env.LOG_LEVEL = previousLogLevel
  return { log, logger, Console, createLogger }
}

const development: Env = { isDevelopment: true, isProduction: false, isTest: false }
const production: Env = { isDevelopment: false, isProduction: true, isTest: false }
const test: Env = { isDevelopment: false, isProduction: false, isTest: true }

describe('winston logger', () => {
  describe('formatConsoleLine', () => {
    it('should print timestamp, level and message', () => {
      expect(formatConsoleLine({ timestamp: 'any_time', level: 'info', message: 'any_message' })).toBe('any_time [info]: any_message')
    })

    it('should append non-empty metadata as indented JSON', () => {
      const line = formatConsoleLine({ timestamp: 'any_time', level: 'info', message: 'any_message', metadata: { requestId: 'any_id' } })

      expect(line).toBe('any_time [info]: any_message\n{\n  "requestId": "any_id"\n}')
    })

    it('should leave out empty metadata', () => {
      expect(formatConsoleLine({ timestamp: 'any_time', level: 'info', message: 'any_message', metadata: {} })).toBe('any_time [info]: any_message')
    })

    it('should append the stack of an error', () => {
      const line = formatConsoleLine({ timestamp: 'any_time', level: 'error', message: 'any_message', stack: 'Error: any\n    at any' })

      expect(line).toBe('any_time [error]: any_message\nError: any\n    at any')
    })
  })

  describe('configuration', () => {
    it('should log human-readable lines at debug level in development', () => {
      const { Console, createLogger } = loadLogger(development)

      expect(Console).toHaveBeenCalledWith({ format: { combine: ['colorize', 'printf'] }, level: 'debug', silent: false })
      expect(createLogger).toHaveBeenCalledWith(expect.objectContaining({ level: 'debug', exitOnError: false }))
    })

    it('should log JSON at info level in production', () => {
      const { Console } = loadLogger(production)

      expect(Console).toHaveBeenCalledWith({ format: 'json', level: 'info', silent: false })
    })

    it('should be silent under test', () => {
      const { Console } = loadLogger(test)

      expect(Console).toHaveBeenCalledWith(expect.objectContaining({ silent: true }))
    })

    it('should use LOG_LEVEL when it is set', () => {
      const { Console, createLogger } = loadLogger(production, 'warn')

      expect(Console).toHaveBeenCalledWith(expect.objectContaining({ level: 'warn' }))
      expect(createLogger).toHaveBeenCalledWith(expect.objectContaining({ level: 'warn' }))
    })

    it('should add timestamp, error stacks and metadata to every entry', () => {
      const { createLogger } = loadLogger(development)

      expect(createLogger).toHaveBeenCalledWith(expect.objectContaining({ format: { combine: ['timestamp', 'errors', 'metadata'] } }))
    })
  })

  describe('log', () => {
    it.each(['error', 'warn', 'info', 'http', 'debug'] as const)('should forward %s with its metadata', (level) => {
      const { log, logger } = loadLogger(development)

      log[level]('any_message', { any: 'meta' })

      expect(logger[level]).toHaveBeenCalledWith('any_message', { any: 'meta' })
    })
  })
})
