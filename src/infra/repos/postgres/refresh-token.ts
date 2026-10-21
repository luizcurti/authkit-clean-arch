import { IsNull, LessThan } from 'typeorm'
import { DeleteExpiredRefreshTokens, LoadRefreshTokenByHash, RevokeRefreshToken, RevokeRefreshTokenFamily, SaveRefreshToken } from '@/domain/contracts/repositories'
import { PgRefreshToken } from '@/infra/repos/postgres/entities'
import { PgRepository } from '@/infra/repos/postgres/repository'

type SaveInput = SaveRefreshToken.Input
type LoadInput = LoadRefreshTokenByHash.Input
type LoadOutput = LoadRefreshTokenByHash.Output
type RevokeInput = RevokeRefreshToken.Input
type RevokeOutput = RevokeRefreshToken.Output
type RevokeFamilyInput = RevokeRefreshTokenFamily.Input
type DeleteExpiredInput = DeleteExpiredRefreshTokens.Input
type DeleteExpiredOutput = DeleteExpiredRefreshTokens.Output

export class PgRefreshTokenRepository extends PgRepository implements SaveRefreshToken, LoadRefreshTokenByHash, RevokeRefreshToken, RevokeRefreshTokenFamily, DeleteExpiredRefreshTokens {
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

  // Conditional UPDATE: of two concurrent rotations of the same token only one gets affected = 1
  async revokeRefreshToken ({ id }: RevokeInput): Promise<RevokeOutput> {
    const pgRefreshTokenRepo = this.getRepository(PgRefreshToken)
    const result = await pgRefreshTokenRepo.update({ id: parseInt(id), revokedAt: IsNull() }, { revokedAt: new Date() })
    return result.affected === 1
  }

  async revokeRefreshTokenFamily ({ familyId }: RevokeFamilyInput): Promise<void> {
    const pgRefreshTokenRepo = this.getRepository(PgRefreshToken)
    await pgRefreshTokenRepo.update({ familyId, revokedAt: IsNull() }, { revokedAt: new Date() })
  }

  async deleteExpiredRefreshTokens ({ expiredBefore }: DeleteExpiredInput): Promise<DeleteExpiredOutput> {
    const pgRefreshTokenRepo = this.getRepository(PgRefreshToken)
    const result = await pgRefreshTokenRepo.delete({ expiresAt: LessThan(expiredBefore) })
    return result.affected ?? 0
  }
}
