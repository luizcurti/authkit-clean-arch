import { UUIDHandler } from '@/infra/gateways'

export const makeUuidHandler = (): UUIDHandler => {
  return new UUIDHandler()
}
