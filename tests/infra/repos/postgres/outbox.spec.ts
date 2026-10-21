import { IBackup } from 'pg-mem'
import { Repository } from 'typeorm'
import { PgOutboxEvent } from '@/infra/repos/postgres/entities'
import { PgOutboxRepository, PgRepository } from '@/infra/repos/postgres'
import { makeFakeDb } from '@/tests/infra/repos/mocks'
import { PgConnection } from '@/infra/repos/postgres/helpers'

// claimOutboxEvents needs SKIP LOCKED: covered in tests/postgres/outbox.pg.test.ts
describe('PgOutboxRepository', () => {
  let sut: PgOutboxRepository
  let connection: PgConnection
  let pgOutboxRepo: Repository<PgOutboxEvent>
  let pgBackup: IBackup

  beforeAll(async () => {
    connection = PgConnection.getInstance()
    const db = await makeFakeDb([PgOutboxEvent])
    pgBackup = db.backup()
    pgOutboxRepo = connection.getRepository(PgOutboxEvent)
  })

  afterAll(async () => {
    await connection.disconnect()
  })

  beforeEach(() => {
    pgBackup.restore()
    sut = new PgOutboxRepository()
  })

  const saveLeasedEvent = async (): Promise<PgOutboxEvent> => pgOutboxRepo.save({
    type: 'ProfilePictureReplaced',
    payload: { pictureKey: 'any_key.png' },
    attempts: 1,
    lockedUntil: new Date(Date.now() + 60 * 1000)
  })

  it('Should extend PgRepository', async () => {
    expect(sut).toBeInstanceOf(PgRepository)
  })

  describe('completeOutboxEvent', () => {
    it('should mark the event processed and release its lease', async () => {
      const { id } = await saveLeasedEvent()

      await sut.completeOutboxEvent({ id: id.toString() })
      const event = await pgOutboxRepo.findOneBy({ id })

      expect(event?.processedAt).toBeInstanceOf(Date)
      expect(event?.lockedUntil).toBeNull()
    })
  })

  describe('failOutboxEvent', () => {
    it('should record the error and leave the event pending, still leased until its retry', async () => {
      const { id, lockedUntil } = await saveLeasedEvent()

      await sut.failOutboxEvent({ id: id.toString(), error: 'storage_error' })
      const event = await pgOutboxRepo.findOneBy({ id })

      expect(event).toMatchObject({ lastError: 'storage_error', processedAt: null, attempts: 1 })
      expect(event?.lockedUntil?.getTime()).toBe(lockedUntil?.getTime())
    })

    it('should truncate a very long error', async () => {
      const { id } = await saveLeasedEvent()

      await sut.failOutboxEvent({ id: id.toString(), error: 'x'.repeat(5000) })
      const event = await pgOutboxRepo.findOneBy({ id })

      expect(event?.lastError).toHaveLength(1000)
    })
  })
})
