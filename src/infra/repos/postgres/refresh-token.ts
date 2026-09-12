import { IsNull } from 'typeorm'
import { LoadRefreshTokenByHash, RevokeRefreshToken, RevokeRefreshTokenFamily, SaveRefreshToken } from '@/domain/contracts/repositories'
import { PgRefreshToken } from '@/infra/repos/postgres/entities'
import { PgRepository } from '@/infra/repos/postgres/repository'

type SaveInput = SaveRefreshToken.Input
type LoadInput = LoadRefreshTokenByHash.Input
type LoadOutput = LoadRefreshTokenByHash.Output
type RevokeInput = RevokeRefreshToken.Input
type RevokeFamilyInput = RevokeRefreshTokenFamily.Input

export class PgRefreshTokenRepository extends PgRepository implements SaveRefreshToken, LoadRefreshTokenByHash, RevokeRefreshToken, RevokeRefreshTokenFamily {
  async saveRefreshToken ({ userId, tokenHash, expiresAt, familyId }: SaveInput): Promise<void> {
    const pgRefreshTokenRepo = this.getRepository(PgRefreshToken)
    await pgRefreshTokenRepo.save({ userId: parseInt(userId), tokenHash, expiresAt, familyId })
  }

  async loadByHash ({ tokenHash }: LoadInput): Promise<LoadOutput> {
    const pgRefreshTokenRepo = this.getRepository(PgRefreshToken)
    const record = await pgRefreshTokenRepo.findOne({ where: { tokenHash } })
    if (record != null) {
      return {
        id: record.id.toString(),
        userId: record.userId.toString(),
        expiresAt: record.expiresAt,
        revokedAt: record.revokedAt ?? undefined,
        familyId: record.familyId
      }
    }
    return undefined
  }

  async revokeRefreshToken ({ id }: RevokeInput): Promise<void> {
    const pgRefreshTokenRepo = this.getRepository(PgRefreshToken)
    await pgRefreshTokenRepo.update({ id: parseInt(id) }, { revokedAt: new Date() })
  }

  async revokeRefreshTokenFamily ({ familyId }: RevokeFamilyInput): Promise<void> {
    const pgRefreshTokenRepo = this.getRepository(PgRefreshToken)
    await pgRefreshTokenRepo.update({ familyId, revokedAt: IsNull() }, { revokedAt: new Date() })
  }
}
