import { IBackup } from 'pg-mem'
import { Repository } from 'typeorm'
import { PgOutboxEvent, PgUser } from '@/infra/repos/postgres/entities'
import { PgRepository, PgUserProfileRepository } from '@/infra/repos/postgres'
import { makeFakeDb } from '@/tests/infra/repos/mocks'
import { PgConnection } from '@/infra/repos/postgres/helpers'

describe('PgUserProfileRepository', () => {
  let sut: PgUserProfileRepository
  let connection: PgConnection
  let pgUserRepo: Repository<PgUser>
  let pgOutboxRepo: Repository<PgOutboxEvent>
  let pgBackup: IBackup

  beforeAll(async () => {
    connection = PgConnection.getInstance()
    const db = await makeFakeDb([PgUser, PgOutboxEvent])
    pgBackup = db.backup()
    pgUserRepo = connection.getRepository(PgUser)
    pgOutboxRepo = connection.getRepository(PgOutboxEvent)
  })

  afterAll(async () => {
    await connection.disconnect()
  })

  beforeEach(() => {
    pgBackup.restore()
    sut = new PgUserProfileRepository()
  })

  it('Should extend PgRepository', async () => {
    expect(sut).toBeInstanceOf(PgRepository)
  })

  describe('savePicture', () => {
    it('should set the first picture of a profile that had none, scheduling nothing', async () => {
      const { id } = await pgUserRepo.save({ email: 'any_email', initials: 'any_initials' })

      const saved = await sut.savePicture({ id: id.toString(), pictureKey: 'any_key', initials: undefined })
      const pgUser = await pgUserRepo.findOneBy({ id })

      expect(saved).toBe(true)
      expect(pgUser).toMatchObject({ id, pictureKey: 'any_key', initials: null })
      expect(await pgOutboxRepo.count()).toBe(0)
    })

    it('should replace the picture and schedule deleting the replaced one', async () => {
      const { id } = await pgUserRepo.save({ email: 'any_email', pictureKey: 'old_key.png' })

      const saved = await sut.savePicture({ id: id.toString(), pictureKey: 'new_key.png', replacedPictureKey: 'old_key.png' })
      const pgUser = await pgUserRepo.findOneBy({ id })
      const events = await pgOutboxRepo.find()

      expect(saved).toBe(true)
      expect(pgUser?.pictureKey).toBe('new_key.png')
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        type: 'ProfilePictureReplaced',
        payload: { pictureKey: 'old_key.png' },
        processedAt: null
      })
      // pg-mem returns an integer column's DEFAULT as text ('0'); real Postgres returns 0
      expect(Number(events[0].attempts)).toBe(0)
    })

    it('should remove the picture and schedule deleting it', async () => {
      const { id } = await pgUserRepo.save({ email: 'any_email', pictureKey: 'old_key.png' })

      const saved = await sut.savePicture({ id: id.toString(), pictureKey: undefined, initials: 'AN', replacedPictureKey: 'old_key.png' })
      const pgUser = await pgUserRepo.findOneBy({ id })

      expect(saved).toBe(true)
      expect(pgUser).toMatchObject({ pictureKey: null, initials: 'AN' })
      expect(await pgOutboxRepo.count()).toBe(1)
    })

    it('should save nothing and schedule nothing when the picture changed since it was read', async () => {
      const { id } = await pgUserRepo.save({ email: 'any_email', pictureKey: 'concurrent_key.png' })

      const saved = await sut.savePicture({ id: id.toString(), pictureKey: 'new_key.png', replacedPictureKey: 'old_key.png' })
      const pgUser = await pgUserRepo.findOneBy({ id })

      expect(saved).toBe(false)
      expect(pgUser?.pictureKey).toBe('concurrent_key.png')
      expect(await pgOutboxRepo.count()).toBe(0)
    })

    it('should save nothing when a picture appeared on a profile that was read without one', async () => {
      const { id } = await pgUserRepo.save({ email: 'any_email', pictureKey: 'concurrent_key.png' })

      const saved = await sut.savePicture({ id: id.toString(), pictureKey: 'new_key.png' })

      expect(saved).toBe(false)
      expect((await pgUserRepo.findOneBy({ id }))?.pictureKey).toBe('concurrent_key.png')
    })
  })

  describe('load', () => {
    it('should load user profile', async () => {
      const { id } = await pgUserRepo.save({ email: 'any_email', name: 'any_name' })

      const userProfile = await sut.load({ id: id.toString() })

      expect(userProfile?.name).toEqual('any_name')
    })

    it('should load user profile', async () => {
      const { id } = await pgUserRepo.save({ email: 'any_email' })

      const userProfile = await sut.load({ id: id.toString() })

      expect(userProfile?.name).toBeUndefined()
    })

    it('should load the current picture key', async () => {
      const { id } = await pgUserRepo.save({ email: 'any_email', name: 'any_name', pictureKey: 'any_key.png' })

      const userProfile = await sut.load({ id: id.toString() })

      expect(userProfile).toEqual({ name: 'any_name', pictureKey: 'any_key.png' })
    })

    it('should return undefined', async () => {
      const userProfile = await sut.load({ id: '1' })

      expect(userProfile).toBeUndefined()
    })
  })
})
