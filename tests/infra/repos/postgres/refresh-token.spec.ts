import { IBackup } from 'pg-mem'
import { Repository } from 'typeorm'
import { PgRefreshToken } from '@/infra/repos/postgres/entities'
import { PgRefreshTokenRepository, PgRepository } from '@/infra/repos/postgres'
import { makeFakeDb } from '@/tests/infra/repos/mocks'
import { PgConnection } from '@/infra/repos/postgres/helpers'

describe('PgRefreshTokenRepository', () => {
  let sut: PgRefreshTokenRepository
  let connection: PgConnection
  let pgRefreshTokenRepo: Repository<PgRefreshToken>
  let pgBackup: IBackup

  beforeAll(async () => {
    connection = PgConnection.getInstance()
    const db = await makeFakeDb([PgRefreshToken])
    pgBackup = db.backup()
    pgRefreshTokenRepo = connection.getRepository(PgRefreshToken)
  })

  afterAll(async () => {
    await connection.disconnect()
  })

  beforeEach(() => {
    pgBackup.restore()
    sut = new PgRefreshTokenRepository()
  })

  it('Should extend PgRepository', async () => {
    expect(sut).toBeInstanceOf(PgRepository)
  })

  describe('saveRefreshToken / loadByHash', () => {
    it('should persist a refresh token and load it back by hash', async () => {
      const expiresAt = new Date(Date.now() + 60 * 1000)

      await sut.saveRefreshToken({
        userId: '1',
        tokenHash: 'any_hash',
        expiresAt,
        familyId: 'any_family_id'
      })
      const loaded = await sut.loadByHash({ tokenHash: 'any_hash' })

      expect(loaded).toEqual({
        id: '1',
        userId: '1',
        expiresAt,
        revokedAt: undefined,
        familyId: 'any_family_id'
      })
    })

    it('should return undefined when no token matches the hash', async () => {
      const loaded = await sut.loadByHash({ tokenHash: 'unknown_hash' })

      expect(loaded).toBeUndefined()
    })
  })

  describe('revokeRefreshToken', () => {
    it('should set revokedAt on the matching token only', async () => {
      await pgRefreshTokenRepo.save({ userId: 1, tokenHash: 'hash_1', familyId: 'family_1', expiresAt: new Date() })
      const { id } = await pgRefreshTokenRepo.save({ userId: 1, tokenHash: 'hash_2', familyId: 'family_1', expiresAt: new Date() })

      await sut.revokeRefreshToken({ id: id.toString() })

      const [untouched, revoked] = await pgRefreshTokenRepo.find({ order: { id: 'ASC' } })
      expect(untouched.revokedAt).toBeNull()
      expect(revoked.revokedAt).toBeInstanceOf(Date)
    })
  })

  describe('revokeRefreshTokenFamily', () => {
    it('should revoke every non-revoked token sharing the family, leaving other families untouched', async () => {
      await pgRefreshTokenRepo.save({ userId: 1, tokenHash: 'hash_1', familyId: 'family_1', expiresAt: new Date() })
      await pgRefreshTokenRepo.save({ userId: 1, tokenHash: 'hash_2', familyId: 'family_1', expiresAt: new Date() })
      await pgRefreshTokenRepo.save({ userId: 2, tokenHash: 'hash_3', familyId: 'family_2', expiresAt: new Date() })

      await sut.revokeRefreshTokenFamily({ familyId: 'family_1' })

      const records = await pgRefreshTokenRepo.find({ order: { id: 'ASC' } })
      expect(records[0].revokedAt).toBeInstanceOf(Date)
      expect(records[1].revokedAt).toBeInstanceOf(Date)
      expect(records[2].revokedAt).toBeNull()
    })

    it('should not re-revoke an already-revoked token (idempotent on revokedAt)', async () => {
      const alreadyRevokedAt = new Date(Date.now() - 60 * 1000)
      await pgRefreshTokenRepo.save({ userId: 1, tokenHash: 'hash_1', familyId: 'family_1', expiresAt: new Date(), revokedAt: alreadyRevokedAt })

      await sut.revokeRefreshTokenFamily({ familyId: 'family_1' })

      const [record] = await pgRefreshTokenRepo.find()
      expect(record.revokedAt).toEqual(alreadyRevokedAt)
    })
  })
})
