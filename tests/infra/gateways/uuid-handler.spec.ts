import { randomUUID } from 'crypto'
import { UUIDHandler } from '@/infra/gateways'

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn()
}))

const randomUUIDMock = randomUUID as jest.MockedFunction<typeof randomUUID>

describe('UUIDHandler', () => {
  let sut: UUIDHandler

  beforeAll(() => {
    randomUUIDMock.mockReturnValue('any-uuid-0000-0000-000000000000')
  })

  beforeEach(() => {
    sut = new UUIDHandler()
  })

  it('should call crypto.randomUUID', () => {
    sut.uuid({ key: 'any_key' })

    expect(randomUUID).toHaveBeenCalledTimes(1)
  })

  it('should return correct uuid', () => {
    const uuid = sut.uuid({ key: 'any_key' })

    expect(uuid).toBe('any_key_any-uuid-0000-0000-000000000000')
  })
})
