import { PgRepository } from '@/infra/repos/postgres/repository'
import { PgConnection } from '@/infra/repos/postgres/helpers'
import { PgUser } from '@/infra/repos/postgres/entities'

jest.mock('@/infra/repos/postgres/helpers/connection')

class TestRepository extends PgRepository {
  async testMethod (): Promise<any> {
    return this.getRepository(PgUser)
  }

  async testTransaction (): Promise<any> {
    return this.transaction(async () => 'work_result')
  }
}

describe('PgRepository', () => {
  let sut: TestRepository
  let mockConnection: jest.Mocked<PgConnection>

  beforeEach(() => {
    mockConnection = {
      getRepository: jest.fn().mockReturnValue('any_repository'),
      transaction: jest.fn().mockImplementation(async (work: () => Promise<unknown>) => work())
    } as any
    jest.mocked(PgConnection.getInstance).mockReturnValue(mockConnection)
    sut = new TestRepository()
  })

  it('should get repository from connection', async () => {
    const result = await sut.testMethod()

    expect(mockConnection.getRepository).toHaveBeenCalledWith(PgUser)
    expect(result).toBe('any_repository')
  })

  it('should run work in a transaction of the connection', async () => {
    const result = await sut.testTransaction()

    expect(mockConnection.transaction).toHaveBeenCalledTimes(1)
    expect(result).toBe('work_result')
  })
})
