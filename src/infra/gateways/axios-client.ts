import axios from 'axios'
import { HttpGetClient } from '@/infra/gateways'

export class AxiosHttpClient implements HttpGetClient {
  async get<T = unknown> ({ url, params }: HttpGetClient.Input): Promise<T> {
    const result = await axios.get<T>(url, { params })
    return result.data
  }
}
