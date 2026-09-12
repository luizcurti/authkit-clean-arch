import { HttpResponse } from '@/application/helpers'

export interface Middleware<T = unknown> {
  handle: (httpRequest: T) => Promise<HttpResponse>
}
