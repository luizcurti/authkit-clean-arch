// Authentication DTOs
export interface AuthRequest {
  authorization: string
}

export interface AuthResponse {
  userId: string
}

// Facebook Login DTOs
export interface FacebookLoginRequest {
  token?: string | null
}

export interface FacebookLoginResponse {
  accessToken: string
}

// Save Picture DTOs
export interface SavePictureRequest {
  file?: { buffer: Buffer, mimeType: string }
  userId: string
}

export interface SavePictureResponse {
  pictureUrl?: string
  initials?: string
}

// Health Check DTOs
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

// Advanced Health Check DTOs
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

// Generic error DTO
export interface ErrorResponse {
  error: string
  message?: string
  statusCode?: number
}
