import { IBackup } from 'pg-mem'
import { InsertQueryBuilder, Repository } from 'typeorm'
import { PgUser } from '@/infra/repos/postgres/entities'
import { PgRepository, PgUserAccountRepository } from '@/infra/repos/postgres'
import { makeFakeDb } from '@/tests/infra/repos/mocks'
import { PgConnection } from '@/infra/repos/postgres/helpers'
import { AuthenticationError } from '@/domain/entities/errors'

describe('PgUserAccountRepository', () => {
  let sut: PgUserAccountRepository
  let connection: PgConnection
  let pgUserRepo: Repository<PgUser>
  let pgBackup: IBackup

  beforeAll(async () => {
    connection = PgConnection.getInstance()
    const db = await makeFakeDb([PgUser])
    pgBackup = db.backup()
    pgUserRepo = connection.getRepository(PgUser)
  })

  afterAll(async () => {
    await connection.disconnect()
  })

  beforeEach(() => {
    pgBackup.restore()
    sut = new PgUserAccountRepository()
  })

  it('Should extend PgRepository', async () => {
    expect(sut).toBeInstanceOf(PgRepository)
  })

  describe('load', () => {
    it('should return the account linked to the Facebook identity, even if its email differs', async () => {
      await pgUserRepo.save({ email: 'other_email', facebookId: 'any_fb_id' })
      await pgUserRepo.save({ email: 'any_email' })

      const account = await sut.load({ facebookId: 'any_fb_id', email: 'any_email' })

      expect(account).toEqual({ id: '1', facebookId: 'any_fb_id' })
    })

    it('should fall back to the email when no account has the Facebook identity', async () => {
      await pgUserRepo.save({ email: 'any_email', name: 'any_name' })

      const account = await sut.load({ facebookId: 'any_fb_id', email: 'any_email' })

      expect(account).toEqual({ id: '1', name: 'any_name' })
    })

    it('should return undefined when neither the Facebook identity nor the email exist', async () => {
      await pgUserRepo.save({ email: 'someone_else', facebookId: 'other_fb_id' })

      const account = await sut.load({ facebookId: 'any_fb_id', email: 'any_email' })

      expect(account).toBeUndefined()
    })

    // An undefined where value must throw: dropped, it would match an arbitrary account
    it('should never treat an undefined where value as "match anything"', async () => {
      await pgUserRepo.save({ email: 'victim_email' })

      const promise = pgUserRepo.findOne({ where: { email: undefined } })

      await expect(promise).rejects.toThrow(/Undefined value encountered/)
    })
  })

  describe('saveWithFacebook', () => {
    it('should link to the existing row instead of duplicating when the email was inserted concurrently', async () => {
      await pgUserRepo.save({ email: 'any_email', name: 'first_name' })

      const { id } = await sut.saveWithFacebook({ email: 'any_email', name: 'any_name', facebookId: 'any_fb_id' })

      const users = await pgUserRepo.find()
      expect(id).toBe('1')
      expect(users).toHaveLength(1)
      expect(users[0]).toMatchObject({ name: 'first_name', facebookId: 'any_fb_id' })
    })

    // pg-mem ignores ON CONFLICT … WHERE: the real refusal is in tests/postgres/user-account.pg.test.ts

    it('should create an account if id is undefined', async () => {
      const { id } = await sut.saveWithFacebook({
        email: 'any_email',
        name: 'any_name',
        facebookId: 'any_fb_id'
      })
      const pgUser = await pgUserRepo.findOne({ where: { email: 'any_email' } })

      expect(pgUser?.id).toBe(1)
      expect(id).toBe('1')
    })

    it('should update the name of an account already linked to the same Facebook identity', async () => {
      await pgUserRepo.save({ email: 'any_email', name: 'any_name', facebookId: 'any_fb_id' })

      const { id } = await sut.saveWithFacebook({ id: '1', email: 'new_email', name: 'new_name', facebookId: 'any_fb_id' })
      const pgUser = await pgUserRepo.findOne({ where: { id: 1 } })

      expect(id).toBe('1')
      expect(pgUser).toMatchObject({ id: 1, email: 'any_email', name: 'new_name', facebookId: 'any_fb_id' })
    })

    it('should link an existing account that has no Facebook identity yet', async () => {
      await pgUserRepo.save({ email: 'any_email', name: 'any_name' })

      await sut.saveWithFacebook({ id: '1', email: 'any_email', name: 'new_name', facebookId: 'any_fb_id' })
      const pgUser = await pgUserRepo.findOne({ where: { id: 1 } })

      expect(pgUser).toMatchObject({ id: 1, name: 'new_name', facebookId: 'any_fb_id' })
    })

    it('should refuse to link when the insert updated no row because the email belongs to another Facebook identity', async () => {
      // PostgreSQL returns no row when the ON CONFLICT … WHERE condition is false
      jest.spyOn(InsertQueryBuilder.prototype, 'execute').mockResolvedValueOnce({ raw: [], identifiers: [], generatedMaps: [] })

      const promise = sut.saveWithFacebook({ email: 'any_email', name: 'any_name', facebookId: 'second_fb_id' })

      await expect(promise).rejects.toThrow(new AuthenticationError())
    })

    // A concurrent login linked the account after the use case loaded it
    it('should refuse to re-bind an account linked to another Facebook identity', async () => {
      await pgUserRepo.save({ email: 'any_email', name: 'any_name', facebookId: 'first_fb_id' })

      const promise = sut.saveWithFacebook({ id: '1', email: 'any_email', name: 'attacker', facebookId: 'second_fb_id' })

      await expect(promise).rejects.toThrow(new AuthenticationError())
      const pgUser = await pgUserRepo.findOne({ where: { id: 1 } })
      expect(pgUser).toMatchObject({ name: 'any_name', facebookId: 'first_fb_id' })
    })
  })
})
