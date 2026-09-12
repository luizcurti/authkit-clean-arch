import axios from 'axios'
import { AxiosHttpClient } from '@/infra/gateways'
import { ExternalServiceError } from '@/domain/entities/errors'

jest.mock('axios')

const makeAxiosError = ({ status }: { status?: number } = {}): any => ({
  isAxiosError: true,
  response: status === undefined ? undefined : { status }
})

const makeRealAxiosError = ({ status }: { status?: number } = {}): Error => {
  const error: any = new Error('network_error')
  error.isAxiosError = true
  error.response = status === undefined ? undefined : { status }
  return error
}

describe('AxiosHttpClient', () => {
  let sut: AxiosHttpClient
  let fakeAxios: jest.Mocked<typeof axios>
  let url: string
  let params: Record<string, any>

  beforeAll(() => {
    url = 'any_url'
    params = {
      any: 'any'
    }
    fakeAxios = axios as jest.Mocked<typeof axios>
    fakeAxios.isAxiosError = jest.fn((error: any) => error?.isAxiosError === true) as any
  })

  beforeEach(() => {
    jest.clearAllMocks()
    fakeAxios.isAxiosError = jest.fn((error: any) => error?.isAxiosError === true) as any
    fakeAxios.get.mockResolvedValue({
      status: 200,
      data: 'any_data'
    })
    sut = new AxiosHttpClient()
  })

  describe('get', () => {
    it('Should call get with correct params and timeout', async () => {
      await sut.get({ url, params })

      expect(fakeAxios.get).toHaveBeenCalledWith(url, { params, timeout: 5000 })
      expect(fakeAxios.get).toHaveBeenCalledTimes(1)
    })

    it('Should call data on success', async () => {
      const result = await sut.get({ url, params })

      expect(result).toEqual('any_data')
    })

    it('Should rethrow as-is if get throws a non-axios error', async () => {
      fakeAxios.get.mockRejectedValueOnce(new Error('http_error'))

      const promise = sut.get({ url, params })

      await expect(promise).rejects.toThrow(new Error('http_error'))
      expect(fakeAxios.get).toHaveBeenCalledTimes(1)
    })

    it('Should rethrow as-is (no retry) if get throws a 4xx axios error', async () => {
      const error = makeAxiosError({ status: 400 })
      fakeAxios.get.mockRejectedValueOnce(error)

      const promise = sut.get({ url, params })

      await expect(promise).rejects.toBe(error)
      expect(fakeAxios.get).toHaveBeenCalledTimes(1)
    })

    it('Should retry and eventually throw ExternalServiceError on repeated 5xx errors', async () => {
      const error = makeAxiosError({ status: 502 })
      fakeAxios.get.mockRejectedValue(error)

      const promise = sut.get({ url, params })

      await expect(promise).rejects.toBeInstanceOf(ExternalServiceError)
      expect(fakeAxios.get).toHaveBeenCalledTimes(4)
    }, 10000)

    it('Should retry and eventually throw ExternalServiceError on repeated network errors', async () => {
      const error = makeAxiosError()
      fakeAxios.get.mockRejectedValue(error)

      const promise = sut.get({ url, params })

      await expect(promise).rejects.toBeInstanceOf(ExternalServiceError)
      expect(fakeAxios.get).toHaveBeenCalledTimes(4)
    }, 10000)

    it('Should wrap the original Error instance as the cause of ExternalServiceError', async () => {
      const error = makeRealAxiosError({ status: 502 })
      fakeAxios.get.mockRejectedValue(error)

      const promise = sut.get({ url, params })

      await expect(promise).rejects.toBeInstanceOf(ExternalServiceError)
      await expect(promise).rejects.toHaveProperty('cause', error)
      expect(fakeAxios.get).toHaveBeenCalledTimes(4)
    }, 10000)

    it('Should succeed if a retry recovers after a 5xx error', async () => {
      fakeAxios.get
        .mockRejectedValueOnce(makeAxiosError({ status: 503 }))
        .mockResolvedValueOnce({ status: 200, data: 'recovered_data' })

      const result = await sut.get({ url, params })

      expect(result).toEqual('recovered_data')
      expect(fakeAxios.get).toHaveBeenCalledTimes(2)
    })
  })
})
