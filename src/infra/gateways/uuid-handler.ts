import { randomUUID } from 'crypto'
import { UUIDGenerator } from '@/domain/contracts/gateways'

export class UUIDHandler implements UUIDGenerator {
  uuid ({ key }: UUIDGenerator.Input): UUIDGenerator.Output {
    return `${key}_${randomUUID()}`
  }
}
