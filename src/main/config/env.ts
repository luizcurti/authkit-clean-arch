import { z } from 'zod'

// Read before validation: production decides which variables are required
const nodeEnv = process.env.NODE_ENV || 'development'
const isProduction = nodeEnv === 'production'

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_DATABASE: z.string().default('authkit_db'),
  NODE_ENV: z.string().default('development'),

  FB_CLIENT_ID: isProduction
    ? z.string().min(1, 'FB_CLIENT_ID is required in production')
    : z.string().default('test_fb_client_id'),
  FB_CLIENT_SECRET: isProduction
    ? z.string().min(1, 'FB_CLIENT_SECRET is required in production')
    : z.string().default('test_fb_client_secret'),

  JWT_SECRET: isProduction
    ? z.string().min(32, 'JWT_SECRET must be at least 32 characters in production')
    : z.string().default('test_secret_key_for_dev_and_tests_only_change_in_prod'),
  JWT_ISSUER: z.string().min(1).default('authkit-clean-arch'),
  JWT_AUDIENCE: z.string().min(1).default('authkit-clean-arch-api'),

  S3_ACCESS_KEY_ID: isProduction
    ? z.string().min(1, 'S3_ACCESS_KEY_ID is required in production')
    : z.string().default('test_s3_access_key'),
  S3_SECRET_ACCESS_KEY: isProduction
    ? z.string().min(1, 'S3_SECRET_ACCESS_KEY is required in production')
    : z.string().default('test_s3_secret_key'),
  S3_BUCKET: isProduction
    ? z.string().min(1, 'S3_BUCKET is required in production')
    : z.string().default('test-bucket'),
  S3_REGION: z.string().default('us-east-1'),
  // S3-compatible endpoint (S3Mock). Unset = AWS
  S3_ENDPOINT: z.url().optional(),
  S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).default('false'),
  // Base URL pictures are served from (CloudFront). Unset = pre-signed URLs
  S3_PUBLIC_BASE_URL: z.url().optional(),

  // Comma-separated CORS allowlist
  CORS_ALLOWED_ORIGINS: z.string().default(''),

  // Reverse-proxy hops whose X-Forwarded-For is trusted. Must match the deployment, or clients share or spoof IPs
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),

  // Requests per minute per client: every route / login, refresh and logout together (ADR-0008)
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(100),
  AUTH_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(10),

  // Bearer token for /api/metrics and /api/health/detailed. Unset: 404 in production, open elsewhere
  OPS_TOKEN: z.string().min(16, 'OPS_TOKEN must be at least 16 characters').optional(),

  // Swagger UI at /api-docs. Default: off in production
  API_DOCS_ENABLED: z.enum(['true', 'false']).optional(),

  // 0 disables the in-process purge (npm run db:purge-refresh-tokens runs it externally)
  REFRESH_TOKEN_PURGE_INTERVAL_MINUTES: z.coerce.number().int().min(0).default(60),

  // 0 disables the in-process outbox worker (npm run outbox:process runs it externally)
  OUTBOX_POLL_INTERVAL_SECONDS: z.coerce.number().int().min(0).default(10)
})

const emptyToUndefined = (value?: string): string | undefined => value === '' ? undefined : value

const rawEnv = {
  PORT: process.env.PORT,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_DATABASE: process.env.DB_DATABASE,
  NODE_ENV: process.env.NODE_ENV,
  FB_CLIENT_ID: process.env.FB_CLIENT_ID,
  FB_CLIENT_SECRET: process.env.FB_CLIENT_SECRET,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_ISSUER: process.env.JWT_ISSUER,
  JWT_AUDIENCE: process.env.JWT_AUDIENCE,
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  S3_BUCKET: process.env.S3_BUCKET,
  S3_REGION: process.env.S3_REGION,
  S3_ENDPOINT: emptyToUndefined(process.env.S3_ENDPOINT),
  S3_FORCE_PATH_STYLE: emptyToUndefined(process.env.S3_FORCE_PATH_STYLE),
  S3_PUBLIC_BASE_URL: emptyToUndefined(process.env.S3_PUBLIC_BASE_URL),
  CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS,
  TRUST_PROXY_HOPS: process.env.TRUST_PROXY_HOPS,
  RATE_LIMIT_PER_MINUTE: process.env.RATE_LIMIT_PER_MINUTE,
  AUTH_RATE_LIMIT_PER_MINUTE: process.env.AUTH_RATE_LIMIT_PER_MINUTE,
  OPS_TOKEN: emptyToUndefined(process.env.OPS_TOKEN),
  API_DOCS_ENABLED: emptyToUndefined(process.env.API_DOCS_ENABLED),
  REFRESH_TOKEN_PURGE_INTERVAL_MINUTES: process.env.REFRESH_TOKEN_PURGE_INTERVAL_MINUTES,
  OUTBOX_POLL_INTERVAL_SECONDS: process.env.OUTBOX_POLL_INTERVAL_SECONDS
}

// A failure means a value is missing in production or invalid anywhere: every environment stops
const result = envSchema.safeParse(rawEnv)
if (!result.success) {
  console.error('Invalid environment configuration:')
  for (const issue of result.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}
const validatedEnv = result.data

export const env = {
  database: {
    host: validatedEnv.DB_HOST,
    port: validatedEnv.DB_PORT,
    user: validatedEnv.DB_USER,
    password: validatedEnv.DB_PASSWORD,
    database: validatedEnv.DB_DATABASE
  },
  facebookApi: {
    clientId: validatedEnv.FB_CLIENT_ID,
    clientSecret: validatedEnv.FB_CLIENT_SECRET
  },
  s3: {
    accessKey: validatedEnv.S3_ACCESS_KEY_ID,
    secret: validatedEnv.S3_SECRET_ACCESS_KEY,
    bucket: validatedEnv.S3_BUCKET,
    region: validatedEnv.S3_REGION,
    endpoint: validatedEnv.S3_ENDPOINT,
    forcePathStyle: validatedEnv.S3_FORCE_PATH_STYLE === 'true',
    publicBaseUrl: validatedEnv.S3_PUBLIC_BASE_URL
  },
  appPort: validatedEnv.PORT,
  jwt: {
    secret: validatedEnv.JWT_SECRET,
    issuer: validatedEnv.JWT_ISSUER,
    audience: validatedEnv.JWT_AUDIENCE
  },
  corsAllowedOrigins: validatedEnv.CORS_ALLOWED_ORIGINS
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0),
  trustProxyHops: validatedEnv.TRUST_PROXY_HOPS,
  rateLimitPerMinute: validatedEnv.RATE_LIMIT_PER_MINUTE,
  authRateLimitPerMinute: validatedEnv.AUTH_RATE_LIMIT_PER_MINUTE,
  opsToken: validatedEnv.OPS_TOKEN,
  apiDocsEnabled: validatedEnv.API_DOCS_ENABLED === undefined
    ? validatedEnv.NODE_ENV !== 'production'
    : validatedEnv.API_DOCS_ENABLED === 'true',
  refreshTokenPurgeIntervalMs: validatedEnv.REFRESH_TOKEN_PURGE_INTERVAL_MINUTES * 60 * 1000,
  outboxPollIntervalMs: validatedEnv.OUTBOX_POLL_INTERVAL_SECONDS * 1000,
  nodeEnv: validatedEnv.NODE_ENV,
  isDevelopment: validatedEnv.NODE_ENV === 'development',
  isProduction: validatedEnv.NODE_ENV === 'production',
  isTest: validatedEnv.NODE_ENV === 'test'
} as const
