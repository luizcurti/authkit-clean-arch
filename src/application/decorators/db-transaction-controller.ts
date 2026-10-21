import { DbTransaction } from '@/application/contracts'
import { Controller } from '@/application/controllers'
import { HttpResponse } from '@/application/helpers'

// handle() never throws, so the status code decides: 5xx rolls back, anything else commits (a 401 for
// refresh-token reuse keeps the family revocation)
class RollbackResponse extends Error {
  constructor (readonly httpResponse: HttpResponse) {
    super('Rolled back because the response was a server error')
  }
}

export class DbTransactionController<T = unknown> extends Controller<T> {
  constructor (
    private readonly decoratee: Controller<T>,
    private readonly db: DbTransaction
  ) {
    super()
  }

  async perform (httpRequest: T): Promise<HttpResponse> {
    try {
      return await this.db.transaction(async () => {
        const httpResponse = await this.decoratee.handle(httpRequest)
        if (httpResponse.statusCode >= 500) throw new RollbackResponse(httpResponse)
        return httpResponse
      })
    } catch (error) {
      if (error instanceof RollbackResponse) return error.httpResponse
      throw error
    }
  }
}
