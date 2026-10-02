export {}

// env.ts reads process.env on load, so each case loads it in isolation
const ENV_KEYS = [
  'PORT', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE', 'NODE_ENV',
  'FB_CLIENT_ID', 'FB_CLIENT_SECRET', 'JWT_SECRET', 'JWT_ISSUER', 'JWT_AUDIENCE',
  'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET', 'S3_REGION', 'S3_ENDPOINT',
  'S3_FORCE_PATH_STYLE', 'S3_PUBLIC_BASE_URL', 'CORS_ALLOWED_ORIGINS', 'TRUST_PROXY_HOPS',
  'RATE_LIMIT_PER_MINUTE', 'AUTH_RATE_LIMIT_PER_MINUTE', 'OPS_TOKEN', 'API_DOCS_ENABLED', 'REFRESH_TOKEN_PURGE_INTERVAL_MINUTES', 'OUTBOX_POLL_INTERVAL_SECONDS'
]

const productionSecrets = {
  NODE_ENV: 'production',
  FB_CLIENT_ID: 'fb_id',
  FB_CLIENT_SECRET: 'fb_secret',
  JWT_SECRET: 'a'.repeat(32),
  S3_ACCESS_KEY_ID: 's3_key',
  S3_SECRET_ACCESS_KEY: 's3_secret',
  S3_BUCKET: 'bucket'
}

class ExitError extends Error {
  constructor (readonly code?: string | number | null) {
    super(`process.exit(${String(code)})`)
  }
}

describe('env', () => {
  const original = { ...process.env }
  let exitSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    for (const key of ENV_KEYS) delete process.env[key]
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(code => { throw new ExitError(code) })
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    process.env = { ...original }
    exitSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  const load = (vars: Record<string, string> = {}): typeof import('@/main/config/env').env => {
    Object.assign(process.env, vars)
    let env!: typeof import('@/main/config/env').env
    jest.isolateModules(() => {
      env = require('@/main/config/env').env
    })
    return env
  }

  const loadExpectingExit = (vars: Record<string, string>): string[] => {
    expect(() => load(vars)).toThrow(ExitError)
    expect(exitSpy).toHaveBeenCalledWith(1)
    return consoleErrorSpy.mock.calls.map(call => call[0] as string)
  }

  describe('outside production', () => {
    it('should fall back to development defaults for everything', () => {
      const env = load()

      expect(env).toEqual({
        database: { host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'authkit_db' },
        facebookApi: { clientId: 'test_fb_client_id', clientSecret: 'test_fb_client_secret' },
        s3: {
          accessKey: 'test_s3_access_key',
          secret: 'test_s3_secret_key',
          bucket: 'test-bucket',
          region: 'us-east-1',
          endpoint: undefined,
          forcePathStyle: false,
          publicBaseUrl: undefined
        },
        appPort: 8080,
        jwt: { secret: 'test_secret_key_for_dev_and_tests_only_change_in_prod', issuer: 'authkit-clean-arch', audience: 'authkit-clean-arch-api' },
        corsAllowedOrigins: [],
        trustProxyHops: 0,
        rateLimitPerMinute: 100,
        authRateLimitPerMinute: 10,
        opsToken: undefined,
        apiDocsEnabled: true,
        refreshTokenPurgeIntervalMs: 60 * 60 * 1000,
        outboxPollIntervalMs: 10 * 1000,
        nodeEnv: 'development',
        isDevelopment: true,
        isProduction: false,
        isTest: false
      })
    })

    it('should read and coerce every variable', () => {
      const env = load({
        PORT: '3000',
        DB_HOST: 'db',
        DB_PORT: '6543',
        DB_USER: 'user',
        DB_PASSWORD: 'pass',
        DB_DATABASE: 'name',
        NODE_ENV: 'test',
        FB_CLIENT_ID: 'fb_id',
        FB_CLIENT_SECRET: 'fb_secret',
        JWT_SECRET: 'jwt_secret',
        JWT_ISSUER: 'issuer',
        JWT_AUDIENCE: 'audience',
        S3_ACCESS_KEY_ID: 'key',
        S3_SECRET_ACCESS_KEY: 'secret',
        S3_BUCKET: 'bucket',
        S3_REGION: 'sa-east-1',
        S3_ENDPOINT: 'http://s3mock:9090',
        S3_FORCE_PATH_STYLE: 'true',
        S3_PUBLIC_BASE_URL: 'https://cdn.example.com',
        CORS_ALLOWED_ORIGINS: ' https://a.com , ,https://b.com ',
        TRUST_PROXY_HOPS: '2',
        RATE_LIMIT_PER_MINUTE: '500',
        AUTH_RATE_LIMIT_PER_MINUTE: '50',
        OPS_TOKEN: 'o'.repeat(16),
        API_DOCS_ENABLED: 'false',
        REFRESH_TOKEN_PURGE_INTERVAL_MINUTES: '5',
        OUTBOX_POLL_INTERVAL_SECONDS: '0'
      })

      expect(env).toEqual({
        database: { host: 'db', port: 6543, user: 'user', password: 'pass', database: 'name' },
        facebookApi: { clientId: 'fb_id', clientSecret: 'fb_secret' },
        s3: {
          accessKey: 'key',
          secret: 'secret',
          bucket: 'bucket',
          region: 'sa-east-1',
          endpoint: 'http://s3mock:9090',
          forcePathStyle: true,
          publicBaseUrl: 'https://cdn.example.com'
        },
        appPort: 3000,
        jwt: { secret: 'jwt_secret', issuer: 'issuer', audience: 'audience' },
        corsAllowedOrigins: ['https://a.com', 'https://b.com'],
        trustProxyHops: 2,
        rateLimitPerMinute: 500,
        authRateLimitPerMinute: 50,
        opsToken: 'o'.repeat(16),
        apiDocsEnabled: false,
        refreshTokenPurgeIntervalMs: 5 * 60 * 1000,
        outboxPollIntervalMs: 0,
        nodeEnv: 'test',
        isDevelopment: false,
        isProduction: false,
        isTest: true
      })
    })

    it.each(['S3_ENDPOINT', 'S3_FORCE_PATH_STYLE', 'S3_PUBLIC_BASE_URL', 'OPS_TOKEN', 'API_DOCS_ENABLED'])('should treat an empty %s as unset', (key) => {
      expect(() => load({ [key]: '' })).not.toThrow()
    })

    it('should turn the API docs on explicitly', () => {
      expect(load({ API_DOCS_ENABLED: 'true' }).apiDocsEnabled).toBe(true)
    })

    it.each([
      ['a non-numeric PORT', { PORT: 'abc' }, 'PORT'],
      ['a RATE_LIMIT_PER_MINUTE of 0', { RATE_LIMIT_PER_MINUTE: '0' }, 'RATE_LIMIT_PER_MINUTE'],
      ['a non-numeric AUTH_RATE_LIMIT_PER_MINUTE', { AUTH_RATE_LIMIT_PER_MINUTE: 'many' }, 'AUTH_RATE_LIMIT_PER_MINUTE'],
      ['a negative TRUST_PROXY_HOPS', { TRUST_PROXY_HOPS: '-1' }, 'TRUST_PROXY_HOPS'],
      ['a fractional OUTBOX_POLL_INTERVAL_SECONDS', { OUTBOX_POLL_INTERVAL_SECONDS: '1.5' }, 'OUTBOX_POLL_INTERVAL_SECONDS'],
      ['a negative REFRESH_TOKEN_PURGE_INTERVAL_MINUTES', { REFRESH_TOKEN_PURGE_INTERVAL_MINUTES: '-5' }, 'REFRESH_TOKEN_PURGE_INTERVAL_MINUTES'],
      ['an S3_ENDPOINT that is not a URL', { S3_ENDPOINT: 'not a url' }, 'S3_ENDPOINT'],
      ['an S3_PUBLIC_BASE_URL that is not a URL', { S3_PUBLIC_BASE_URL: 'not a url' }, 'S3_PUBLIC_BASE_URL'],
      ['an S3_FORCE_PATH_STYLE other than true/false', { S3_FORCE_PATH_STYLE: 'yes' }, 'S3_FORCE_PATH_STYLE'],
      ['an API_DOCS_ENABLED other than true/false', { API_DOCS_ENABLED: '1' }, 'API_DOCS_ENABLED'],
      ['an OPS_TOKEN shorter than 16 characters', { OPS_TOKEN: 'short' }, 'OPS_TOKEN: OPS_TOKEN must be at least 16 characters'],
      ['an empty JWT_ISSUER', { JWT_ISSUER: '' }, 'JWT_ISSUER'],
      ['an empty JWT_AUDIENCE', { JWT_AUDIENCE: '' }, 'JWT_AUDIENCE']
    ])('should print the problem and exit with 1 on %s', (_, vars, expected) => {
      const printed = loadExpectingExit(vars)

      expect(printed[0]).toBe('Invalid environment configuration:')
      expect(printed.some(line => line.includes(expected))).toBe(true)
    })
  })

  describe('in production', () => {
    it('should load with every secret set, turning the API docs off by default', () => {
      const env = load(productionSecrets)

      expect(env.isProduction).toBe(true)
      expect(env.apiDocsEnabled).toBe(false)
      expect(env.jwt.secret).toBe('a'.repeat(32))
    })

    it('should allow the API docs to be turned on', () => {
      expect(load({ ...productionSecrets, API_DOCS_ENABLED: 'true' }).apiDocsEnabled).toBe(true)
    })

    it.each([
      ['FB_CLIENT_ID', 'FB_CLIENT_ID is required in production'],
      ['FB_CLIENT_SECRET', 'FB_CLIENT_SECRET is required in production'],
      ['S3_ACCESS_KEY_ID', 'S3_ACCESS_KEY_ID is required in production'],
      ['S3_SECRET_ACCESS_KEY', 'S3_SECRET_ACCESS_KEY is required in production'],
      ['S3_BUCKET', 'S3_BUCKET is required in production']
    ])('should exit with 1 when %s is empty', (key, message) => {
      const printed = loadExpectingExit({ ...productionSecrets, [key]: '' })

      expect(printed).toContain(`  ${key}: ${message}`)
    })

    it.each(['FB_CLIENT_ID', 'JWT_SECRET', 'S3_BUCKET'])('should exit with 1 when %s is missing, with no development default', (key) => {
      const vars: Record<string, string> = { ...productionSecrets }
      delete vars[key]

      const printed = loadExpectingExit(vars)

      expect(printed.some(line => line.startsWith(`  ${key}:`))).toBe(true)
    })

    it('should exit with 1 when JWT_SECRET is shorter than 32 characters', () => {
      const printed = loadExpectingExit({ ...productionSecrets, JWT_SECRET: 'a'.repeat(31) })

      expect(printed).toContain('  JWT_SECRET: JWT_SECRET must be at least 32 characters in production')
    })
  })
})
