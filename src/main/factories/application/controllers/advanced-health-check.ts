import { AdvancedHealthCheckController } from '@/application/controllers'
import { PgConnection } from '@/infra/repos/postgres/helpers/connection'
import { log } from '@/infra/logger'

export const makeAdvancedHealthCheckController = (): AdvancedHealthCheckController => {
  return new AdvancedHealthCheckController(PgConnection.getInstance(), log)
}
