import { z } from 'zod'

// Determina o ambiente antes da validação
const currentEnv = process.env.NODE_ENV || 'development'
const isProduction = currentEnv === 'production'
const isTest = currentEnv === 'test'

const envSchema = z.object({
  // Database Configuration
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_DATABASE: z.string().default('nodejs_tdd_db'),

  // Facebook API Configuration - OBRIGATÓRIAS em produção
  FB_CLIENT_ID: isProduction 
    ? z.string().min(1, 'FB_CLIENT_ID é obrigatório em produção')
    : z.string().optional().default('test_fb_client_id'),
  FB_CLIENT_SECRET: isProduction
    ? z.string().min(1, 'FB_CLIENT_SECRET é obrigatório em produção')
    : z.string().optional().default('test_fb_client_secret'),

  // JWT Configuration - OBRIGATÓRIA em produção
  JWT_SECRET: isProduction
    ? z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres em produção')
    : z.string().default('development_jwt_secret_key_minimum_32_characters_required'),

  // AWS S3 Configuration (opcional para features de upload)
  S3_ACCESS_KEY_ID: z.string().optional().default(''),
  S3_SECRET_ACCESS_KEY: z.string().optional().default(''),
  S3_BUCKET: z.string().optional().default(''),

  // Application Configuration
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
})

// Validação com tratamento de erro adequado
let validatedEnv: z.infer<typeof envSchema>

try {
  validatedEnv = envSchema.parse(process.env)
  
  // Avisos para ambiente de desenvolvimento
  if (!isProduction && !isTest) {
    const missingVars: string[] = []
    if (!process.env.FB_CLIENT_ID) missingVars.push('FB_CLIENT_ID')
    if (!process.env.FB_CLIENT_SECRET) missingVars.push('FB_CLIENT_SECRET')
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) missingVars.push('JWT_SECRET')
    
    if (missingVars.length > 0) {
      console.warn('⚠️  Aviso: Usando valores padrão para desenvolvimento:')
      missingVars.forEach(v => console.warn(`  - ${v}`))
      console.warn('   Em produção, essas variáveis são OBRIGATÓRIAS!\n')
    }
  }
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Erro de configuração - Variáveis de ambiente inválidas:')
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`)
    })
    console.error('\n💡 Verifique seu arquivo .env e certifique-se de configurar todas as variáveis obrigatórias.')
    console.error('   Consulte o arquivo .env.example para referência.\n')
    process.exit(1)
  }
  throw error
}

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
