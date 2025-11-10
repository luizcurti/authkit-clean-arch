import { AdvancedHealthCheckController } from '@/application/controllers'
import { PgConnection } from '@/infra/repos/postgres/helpers/connection'

export const makeAdvancedHealthCheckController = (): AdvancedHealthCheckController => {
  return new AdvancedHealthCheckController(PgConnection.getInstance())
}
