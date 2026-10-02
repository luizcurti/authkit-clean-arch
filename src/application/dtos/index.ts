export interface AuthRequest {
  authorization: string
}

export interface AuthResponse {
  userId: string
}

export interface FacebookLoginRequest {
  token?: string | null
}

export interface FacebookLoginResponse {
  accessToken: string
  refreshToken: string
}

export interface RefreshTokenRequest {
  refreshToken?: string | null
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
}

export interface LogoutRequest {
  refreshToken?: string | null
}

export interface SavePictureRequest {
  file?: { buffer: Buffer, mimeType: string }
  userId: string
}

export interface SavePictureResponse {
  pictureUrl?: string
  initials?: string
}

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
