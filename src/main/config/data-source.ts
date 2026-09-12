import './module-alias'

import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { ormConfig } from '@/main/config/orm'

export default new DataSource(ormConfig)
