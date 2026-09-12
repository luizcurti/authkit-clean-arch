import axios from 'axios'
import { HttpGetClient } from '@/infra/gateways'
import { ExternalServiceError } from '@/domain/entities/errors'

const TIMEOUT_MS = 5000
const RETRY_DELAYS_MS = [100, 200, 400]

const isRetryable = (error: unknown): boolean => {
  return axios.isAxiosError(error) && (error.response === undefined || error.response.status >= 500)
}

const wait = async (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

export class AxiosHttpClient implements HttpGetClient {
  async get<T = unknown> ({ url, params }: HttpGetClient.Input): Promise<T> {
    let lastError: unknown

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        const result = await axios.get<T>(url, { params, timeout: TIMEOUT_MS })
        return result.data
      } catch (error) {
        lastError = error
        const isLastAttempt = attempt === RETRY_DELAYS_MS.length
        if (!isRetryable(error) || isLastAttempt) break
        await wait(RETRY_DELAYS_MS[attempt])
      }
    }

    if (isRetryable(lastError)) {
      throw new ExternalServiceError(lastError instanceof Error ? lastError : undefined)
    }
    throw lastError
  }
}
