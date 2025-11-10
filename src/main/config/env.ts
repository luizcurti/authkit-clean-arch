import { z } from 'zod'

// Determine environment before validation
const nodeEnv = process.env.NODE_ENV || 'development'
const isProduction = nodeEnv === 'production'
const isTest = nodeEnv === 'test'
const isDevelopment = !isProduction && !isTest

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('docker'),
  DB_DATABASE: z.string().default('advanced_tdd_clean_arch'),
  NODE_ENV: z.string().default('development'),

  // Facebook API Configuration - REQUIRED in production
  FB_CLIENT_ID: isProduction
    ? z.string().min(1, 'FB_CLIENT_ID is required in production')
    : z.string().default('test_fb_client_id'),
  FB_CLIENT_SECRET: isProduction
    ? z.string().min(1, 'FB_CLIENT_SECRET is required in production')
    : z.string().default('test_fb_client_secret'),

  // JWT Configuration - REQUIRED in production
  JWT_SECRET: isProduction
    ? z.string().min(32, 'JWT_SECRET must be at least 32 characters in production')
    : z.string().default('test_secret_key_for_dev_and_tests_only_change_in_prod'),

  // AWS S3 Configuration - REQUIRED in production
  S3_ACCESS_KEY_ID: isProduction
    ? z.string().min(1, 'S3_ACCESS_KEY_ID is required in production')
    : z.string().default('test_s3_access_key'),
  S3_SECRET_ACCESS_KEY: isProduction
    ? z.string().min(1, 'S3_SECRET_ACCESS_KEY is required in production')
    : z.string().default('test_s3_secret_key'),
  S3_BUCKET: isProduction
    ? z.string().min(1, 'S3_BUCKET is required in production')
    : z.string().default('test-bucket')
})

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
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  S3_BUCKET: process.env.S3_BUCKET
}

// Validation with proper error handling
const result = envSchema.safeParse(rawEnv)

if (!result.success) {
  // Warnings for development environment
  if (isDevelopment) {
    const missingVars = result.error.errors.map(e => e.path.join('.')).join(', ')
    if (missingVars) {
      console.warn('⚠️  Warning: Some environment variables are using default values:')
      console.warn(`   ${missingVars}`)
      console.warn('')
      console.warn('   This is OK for development/testing.')
      console.warn('   In production, these variables are REQUIRED!\n')
    }
  } else {
    // Error in production
    console.error('❌ Configuration error - Invalid environment variables:')
    console.error(result.error.format())
    process.exit(1)
  }
}

const validatedEnv = result.success ? result.data : envSchema.parse({})

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
    bucket: validatedEnv.S3_BUCKET
  },
  appPort: validatedEnv.PORT,
  jwtSecret: validatedEnv.JWT_SECRET,
  nodeEnv: validatedEnv.NODE_ENV,
  isDevelopment: validatedEnv.NODE_ENV === 'development',
  isProduction: validatedEnv.NODE_ENV === 'production',
  isTest: validatedEnv.NODE_ENV === 'test'
} as const

export type Environment = typeof env
