import { mock, MockProxy } from 'jest-mock-extended'
import { DeleteFile } from '@/domain/contracts/gateways'
import { ClaimOutboxEvents, CompleteOutboxEvent, FailOutboxEvent } from '@/domain/contracts/repositories'
import { Outbox } from '@/domain/entities'
import { ProcessOutboxEvents, setupProcessOutboxEvents } from '@/domain/use-cases'

describe('ProcessOutboxEvents', () => {
  let outboxRepository: MockProxy<ClaimOutboxEvents & CompleteOutboxEvent & FailOutboxEvent>
  let fileStorage: MockProxy<DeleteFile>
  let sut: ProcessOutboxEvents

  // No default parameter: an explicit undefined must stay undefined
  const pictureReplaced = (id: string, ...pictureKey: [unknown?]): ClaimOutboxEvents.Output[number] =>
    ({ id, type: 'ProfilePictureReplaced', payload: { pictureKey: pictureKey.length > 0 ? pictureKey[0] : `${id}.png` }, attempts: 1 })

  beforeEach(() => {
    outboxRepository = mock()
    outboxRepository.claimOutboxEvents.mockResolvedValue([pictureReplaced('1')])
    fileStorage = mock()
    fileStorage.delete.mockResolvedValue(undefined)
    sut = setupProcessOutboxEvents(outboxRepository, fileStorage)
  })

  it('should claim one batch with the outbox settings', async () => {
    await sut()

    expect(outboxRepository.claimOutboxEvents).toHaveBeenCalledWith({
      limit: Outbox.batchSize,
      leaseInMs: Outbox.leaseInMs,
      maxAttempts: Outbox.maxAttempts
    })
  })

  it('should do nothing when no event is pending', async () => {
    outboxRepository.claimOutboxEvents.mockResolvedValueOnce([])

    const result = await sut()

    expect(fileStorage.delete).not.toHaveBeenCalled()
    expect(result).toEqual({ processed: 0, failed: 0 })
  })

  it('should delete the replaced picture and complete the event', async () => {
    const result = await sut()

    expect(fileStorage.delete).toHaveBeenCalledWith({ fileName: '1.png' })
    expect(outboxRepository.completeOutboxEvent).toHaveBeenCalledWith({ id: '1' })
    expect(outboxRepository.failOutboxEvent).not.toHaveBeenCalled()
    expect(result).toEqual({ processed: 1, failed: 0 })
  })

  it('should record a failing event and keep processing the rest of the batch', async () => {
    outboxRepository.claimOutboxEvents.mockResolvedValueOnce([pictureReplaced('1'), pictureReplaced('2')])
    fileStorage.delete.mockRejectedValueOnce(new Error('storage_error'))

    const result = await sut()

    expect(outboxRepository.failOutboxEvent).toHaveBeenCalledWith({ id: '1', error: 'storage_error' })
    expect(outboxRepository.completeOutboxEvent).not.toHaveBeenCalledWith({ id: '1' })
    expect(outboxRepository.completeOutboxEvent).toHaveBeenCalledWith({ id: '2' })
    expect(result).toEqual({ processed: 1, failed: 1 })
  })

  it('should record a non Error throwable as text', async () => {
    fileStorage.delete.mockRejectedValueOnce('storage_down')

    await sut()

    expect(outboxRepository.failOutboxEvent).toHaveBeenCalledWith({ id: '1', error: 'storage_down' })
  })

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['not a string', 42]
  ])('should fail a ProfilePictureReplaced event whose pictureKey is %s', async (_, pictureKey) => {
    outboxRepository.claimOutboxEvents.mockResolvedValueOnce([pictureReplaced('1', pictureKey)])

    await sut()

    expect(fileStorage.delete).not.toHaveBeenCalled()
    expect(outboxRepository.failOutboxEvent).toHaveBeenCalledWith({ id: '1', error: 'Invalid ProfilePictureReplaced payload: pictureKey is missing' })
  })

  it('should fail an event with a null payload', async () => {
    outboxRepository.claimOutboxEvents.mockResolvedValueOnce([{ id: '1', type: 'ProfilePictureReplaced', payload: null, attempts: 1 }])

    await sut()

    expect(outboxRepository.failOutboxEvent).toHaveBeenCalledWith({ id: '1', error: 'Invalid ProfilePictureReplaced payload: pictureKey is missing' })
  })

  it('should fail an event of an unknown type', async () => {
    outboxRepository.claimOutboxEvents.mockResolvedValueOnce([{ id: '1', type: 'SomethingElse', payload: {}, attempts: 1 }])

    await sut()

    expect(outboxRepository.failOutboxEvent).toHaveBeenCalledWith({ id: '1', error: 'No handler for outbox event type "SomethingElse"' })
  })

  it('should rethrow when claiming fails', async () => {
    const error = new Error('db_error')
    outboxRepository.claimOutboxEvents.mockRejectedValueOnce(error)

    await expect(sut()).rejects.toThrow(error)
  })
})
