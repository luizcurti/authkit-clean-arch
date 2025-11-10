// DTOs para Authentication
export interface AuthRequest {
  authorization: string
}

export interface AuthResponse {
  userId: string
}

// DTOs para Facebook Login
export interface FacebookLoginRequest {
  token?: any
}

export interface FacebookLoginResponse {
  accessToken: string
}

// DTOs para Save Picture
export interface SavePictureRequest {
  file?: { buffer: Buffer, mimeType: string }
  userId: string
}

export interface SavePictureResponse {
  pictureUrl?: string
  initials?: string
}

// DTOs para Health Check
export interface HealthCheckResponse {
  status: string
  timestamp: string
  uptime: number
  environment: string
  version: string
  memory: {
    used: number
    total: number
  }
}

// DTOs para Advanced Health Check
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface AdvancedHealthCheckResponse {
  status: HealthStatus
  timestamp: string
  uptime: number
  environment: string
  version: string
  checks: {
    database: {
      status: 'up' | 'down'
      responseTime?: number
      error?: string
    }
    memory: {
      status: 'normal' | 'warning' | 'critical'
      used: number
      total: number
      percentage: number
    }
    system: {
      platform: string
      nodeVersion: string
      processId: number
    }
  }
}

// DTO genérico para erros
export interface ErrorResponse {
  error: string
  message?: string
  statusCode?: number
}
