import { AsyncLocalStorage } from 'async_hooks'
import { DataSource, QueryRunner, Repository, ObjectType, ObjectLiteral } from 'typeorm'

import { ormConfig } from '@/main/config/orm'
import { ConnectionNotFoundError } from '@/infra/repos/postgres/helpers'
import { DbTransaction } from '@/application/contracts'

export class PgConnection implements DbTransaction {
  private static instance?: PgConnection
  private connection?: DataSource | undefined
  // The open transaction lives in the request's async context, so concurrent requests never share it
  private readonly transactionContext = new AsyncLocalStorage<QueryRunner>()

  private constructor () {}

  static getInstance (): PgConnection {
    if (PgConnection.instance === undefined) {
      PgConnection.instance = new PgConnection()
    }
    return PgConnection.instance
  }

  async connect (): Promise<void> {
    if (this.connection?.isInitialized !== true) {
      this.connection = new DataSource(ormConfig)
      await this.connection.initialize()
    }
  }

  async disconnect (): Promise<void> {
    if (this.connection === undefined) throw new ConnectionNotFoundError()
    await this.connection.destroy()
    this.connection = undefined
  }

  async transaction<T> (work: () => Promise<T>): Promise<T> {
    if (this.connection === undefined) throw new ConnectionNotFoundError()
    // Join an open transaction: a nested query runner would commit even if the outer one rolls back
    if (this.transactionContext.getStore() !== undefined) return work()
    const queryRunner = this.connection.createQueryRunner()
    await queryRunner.startTransaction()
    try {
      const result = await this.transactionContext.run(queryRunner, work)
      await queryRunner.commitTransaction()
      return result
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
      // v8 counts an unreachable branch here: the catch always throws
      /* c8 ignore next */
    } finally {
      await queryRunner.release()
    }
  }

  getRepository<Entity extends ObjectLiteral> (entity: ObjectType<Entity>): Repository<Entity> {
    if (this.connection === undefined) throw new ConnectionNotFoundError()
    const queryRunner = this.transactionContext.getStore()
    if (queryRunner !== undefined) return queryRunner.manager.getRepository(entity)
    return this.connection.getRepository(entity)
  }

  async runQuery (sql: string): Promise<unknown> {
    if (this.connection === undefined) throw new ConnectionNotFoundError()
    return this.connection.query(sql)
  }
}
