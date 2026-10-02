import { PgConnection } from '@/infra/repos/postgres/helpers'
import { ObjectType, Repository, ObjectLiteral } from 'typeorm'

export abstract class PgRepository {
  constructor (private readonly connection: PgConnection = PgConnection.getInstance()) { }

  getRepository<Entity extends ObjectLiteral> (entity: ObjectType<Entity>): Repository<Entity> {
    return this.connection.getRepository(entity)
  }

  // getRepository() calls inside `work` join the transaction; an open one is joined, not nested
  protected async transaction<T> (work: () => Promise<T>): Promise<T> {
    return this.connection.transaction(work)
  }
}
