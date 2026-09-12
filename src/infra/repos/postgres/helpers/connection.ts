import { DataSource, QueryRunner, Repository, ObjectType, ObjectLiteral } from 'typeorm'

import { ormConfig } from '@/main/config/orm'
import { ConnectionNotFoundError } from '@/infra/repos/postgres/helpers'
import { TransactionNotFoundError } from '@/infra/repos/postgres/helpers/errors'
import { DbTransaction } from '@/application/contracts'

export class PgConnection implements DbTransaction {
  private static instance?: PgConnection
  private query?: QueryRunner | undefined
  private connection?: DataSource | undefined

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
    this.query = undefined
    this.connection = undefined
  }

  async openTransaction (): Promise<void> {
    if (this.connection === undefined) throw new ConnectionNotFoundError()
    this.query = this.connection.createQueryRunner()
    await this.query.startTransaction()
  }

  async closeTransaction (): Promise<void> {
    if (this.query === undefined) throw new TransactionNotFoundError()
    await this.query.release()
  }

  async commit (): Promise<void> {
    if (this.query === undefined) throw new TransactionNotFoundError()
    await this.query.commitTransaction()
  }

  async rollback (): Promise<void> {
    if (this.query === undefined) throw new TransactionNotFoundError()
    await this.query.rollbackTransaction()
  }

  getRepository<Entity extends ObjectLiteral> (entity: ObjectType<Entity>): Repository<Entity> {
    if (this.connection === undefined) throw new ConnectionNotFoundError()
    if (this.query !== undefined) return this.query.manager.getRepository(entity)
    return this.connection.getRepository(entity)
  }

  async runQuery (sql: string): Promise<unknown> {
    if (this.connection === undefined) throw new ConnectionNotFoundError()
    return this.connection.query(sql)
  }
}
