import { z } from 'zod'

const envSchema = z.object({
  // Database Configuration
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_DATABASE: z.string().default('nodejs_tdd_db'),

  // Facebook API Configuration
  FB_CLIENT_ID: z.string().optional().default('1830572067135382'),
  FB_CLIENT_SECRET: z.string().optional().default('XXX'),

  // JWT Configuration
  JWT_SECRET: z.string().min(32).default('your_super_secret_jwt_key_here_minimum_32_chars'),

  // AWS S3 Configuration
  S3_ACCESS_KEY_ID: z.string().optional().default(''),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(''),
  S3_BUCKET: z.string().optional().default(''),

  // Application Configuration
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
})

const validatedEnv = envSchema.parse(process.env)

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
