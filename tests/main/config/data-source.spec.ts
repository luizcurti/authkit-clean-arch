import { DataSource } from 'typeorm'
import { ormConfig } from '@/main/config/orm'

describe('data-source', () => {
  it('should export a DataSource built from the ORM config, for the TypeORM CLI', () => {
    const dataSource: DataSource = require('@/main/config/data-source').default

    expect(dataSource).toBeInstanceOf(DataSource)
    expect(dataSource.options).toBe(ormConfig)
    expect(dataSource.isInitialized).toBe(false)
  })
})
