import { HealthCheckController } from '@/application/controllers'

export const makeHealthCheckController = (): HealthCheckController => {
  return new HealthCheckController()
}