export interface SaveRefreshToken {
  saveRefreshToken: (input: SaveRefreshToken.Input) => Promise<void>
}

export namespace SaveRefreshToken {
  export type Input = {
    userId: string
    tokenHash: string
    expiresAt: Date
    familyId: string
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
    familyId: string
  }
}

export interface RevokeRefreshToken {
  revokeRefreshToken: (input: RevokeRefreshToken.Input) => Promise<RevokeRefreshToken.Output>
}

export namespace RevokeRefreshToken {
  export type Input = {
    id: string
  }

  // true only for the one call that revoked it (atomic under concurrency)
  export type Output = boolean
}

export interface RevokeRefreshTokenFamily {
  revokeRefreshTokenFamily: (input: RevokeRefreshTokenFamily.Input) => Promise<void>
}

export namespace RevokeRefreshTokenFamily {
  export type Input = {
    familyId: string
  }
}

export interface DeleteExpiredRefreshTokens {
  deleteExpiredRefreshTokens: (input: DeleteExpiredRefreshTokens.Input) => Promise<DeleteExpiredRefreshTokens.Output>
}

export namespace DeleteExpiredRefreshTokens {
  export type Input = {
    expiredBefore: Date
  }

  export type Output = number
}
