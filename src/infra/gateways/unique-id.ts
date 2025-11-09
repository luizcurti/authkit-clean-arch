import { UUIDGenerator } from '@/domain/contracts/gateways'

export class UniqueId implements UUIDGenerator {
  uuid ({ key }: UUIDGenerator.Input): UUIDGenerator.Output {
    const date = new Date()
    const yyyy = date.getFullYear().toString()
    const mm = (date.getMonth() + 1).toString().padStart(2, '0')
    const dd = date.getDate().toString().padStart(2, '0')
    const hh = date.getHours().toString().padStart(2, '0')
    const mi = date.getMinutes().toString().padStart(2, '0')
    const ss = date.getSeconds().toString().padStart(2, '0')
    return `${key}_${yyyy}${mm}${dd}${hh}${mi}${ss}`
  }
}
