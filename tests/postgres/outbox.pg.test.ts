import { DataSource } from 'typeorm'
import { PgConnection } from '@/infra/repos/postgres/helpers'
import { PgOutboxRepository, PgUserProfileRepository } from '@/infra/repos/postgres'
import { PgOutboxEvent, PgUser } from '@/infra/repos/postgres/entities'

// Needs real PostgreSQL: SKIP LOCKED, row locks and the database clock
describe('Outbox on PostgreSQL', () => {
  const CONCURRENT = 8
  let connection: PgConnection
  let dataSource: DataSource
  let outbox: PgOutboxRepository
  let profiles: PgUserProfileRepository

  beforeAll(async () => {
    connection = PgConnection.getInstance()
    await connection.connect()
    dataSource = (connection as unknown as { connection: DataSource }).connection
    await dataSource.runMigrations()
    outbox = new PgOutboxRepository()
    profiles = new PgUserProfileRepository()
  })

  afterAll(async () => {
    await connection.disconnect()
  })

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE outbox_events, users RESTART IDENTITY')
  })

  const addEvents = async (count: number): Promise<void> => {
    await dataSource.getRepository(PgOutboxEvent).insert(Array.from({ length: count }, (_, i) => ({
      type: 'ProfilePictureReplaced',
      payload: { pictureKey: `key_${i}.png` }
    })))
  }

  const claim = async (limit: number, overrides: { leaseInMs?: number, maxAttempts?: number } = {}): ReturnType<PgOutboxRepository['claimOutboxEvents']> =>
    outbox.claimOutboxEvents({ limit, leaseInMs: overrides.leaseInMs ?? 60_000, maxAttempts: overrides.maxAttempts ?? 5 })

  describe('claimOutboxEvents', () => {
    it('claims pending events oldest first, counting the attempt', async () => {
      await addEvents(3)

      const events = await claim(2)

      expect(events).toEqual([
        { id: '1', type: 'ProfilePictureReplaced', payload: { pictureKey: 'key_0.png' }, attempts: 1 },
        { id: '2', type: 'ProfilePictureReplaced', payload: { pictureKey: 'key_1.png' }, attempts: 1 }
      ])
    })

    it('never hands the same event to two concurrent workers', async () => {
      await addEvents(CONCURRENT * 2)

      const batches = await Promise.all(Array.from({ length: CONCURRENT }, async () => claim(5)))

      const ids = batches.flat().map(({ id }) => id)
      expect(ids).toHaveLength(CONCURRENT * 2)
      expect(new Set(ids).size).toBe(CONCURRENT * 2)
    })

    it('skips leased events until the lease expires', async () => {
      await addEvents(1)
      await claim(1, { leaseInMs: 200 })

      expect(await claim(1)).toHaveLength(0)
      await new Promise(resolve => setTimeout(resolve, 300))
      expect(await claim(1)).toHaveLength(1)
    })

    it('retries a failed event only after its lease expires', async () => {
      await addEvents(1)
      const [event] = await claim(1, { leaseInMs: 200 })
      await outbox.failOutboxEvent({ id: event.id, error: 'storage_error' })

      expect(await claim(1)).toHaveLength(0)
      await new Promise(resolve => setTimeout(resolve, 300))
      expect(await claim(1)).toEqual([expect.objectContaining({ id: event.id, attempts: 2 })])
    })

    it('skips processed events and events out of attempts', async () => {
      await addEvents(2)
      const [first, second] = await claim(2, { leaseInMs: 1 })
      await outbox.completeOutboxEvent({ id: first.id })
      await outbox.failOutboxEvent({ id: second.id, error: 'storage_error' })
      await new Promise(resolve => setTimeout(resolve, 20))

      expect(await claim(2, { maxAttempts: 1 })).toHaveLength(0)
      expect(await claim(2, { maxAttempts: 2 })).toEqual([expect.objectContaining({ id: second.id, attempts: 2 })])
    })
  })

  describe('savePicture under concurrency', () => {
    it('of many concurrent replacements of the same picture, exactly one wins and one deletion is scheduled', async () => {
      const { id } = await dataSource.getRepository(PgUser).save({ email: 'any@mail.com', pictureKey: 'old.png' })

      const results = await Promise.all(Array.from({ length: CONCURRENT }, async (_, i) =>
        profiles.savePicture({ id: id.toString(), pictureKey: `new_${i}.png`, replacedPictureKey: 'old.png' })
      ))

      expect(results.filter(Boolean)).toHaveLength(1)
      const events = await dataSource.getRepository(PgOutboxEvent).find()
      expect(events).toHaveLength(1)
      expect(events[0].payload).toEqual({ pictureKey: 'old.png' })
    })
  })
})
