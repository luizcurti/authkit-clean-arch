import { DbTransaction } from '@/application/contracts'
import { Controller } from '@/application/controllers'
import { HttpResponse } from '@/application/helpers'

export class DbTransactionController<T = unknown> extends Controller<T> {
  constructor (
    private readonly decoratee: Controller<T>,
    private readonly db: DbTransaction
  ) {
    super()
  }

  async perform (httpRequest: T): Promise<HttpResponse> {
    await this.db.openTransaction()
    try {
      const httpResponse = await this.decoratee.perform(httpRequest)
      await this.db.commit()
      return httpResponse
    } catch (error) {
      await this.db.rollback()
      throw error
    /* c8 ignore next 2 */
    } finally {
      await this.db.closeTransaction()
    }
  }
}
