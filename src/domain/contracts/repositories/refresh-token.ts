export interface SaveRefreshToken {
  saveRefreshToken: (input: SaveRefreshToken.Input) => Promise<void>
}

export namespace SaveRefreshToken {
  export type Input = {
    userId: string
    tokenHash: string
    expiresAt: Date
  }
}

export interface LoadRefreshTokenByHash {
  loadByHash: (input: LoadRefreshTokenByHash.Input) => Promise<LoadRefreshTokenByHash.Output>
}

export namespace LoadRefreshTokenByHash {
  export type Input = {
    tokenHash: string
  }

  export type Output = undefined | {
    id: string
    userId: string
    expiresAt: Date
    revokedAt?: Date
  }
}

export interface RevokeRefreshToken {
  revokeRefreshToken: (input: RevokeRefreshToken.Input) => Promise<void>
}

export namespace RevokeRefreshToken {
  export type Input = {
    id: string
  }
}
