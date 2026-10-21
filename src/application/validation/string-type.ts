import { InvalidFieldTypeError } from '@/application/errors'
import { Validator } from '@/application/validation/validator'

// Rejects a present non-string value; absence is Required's job
export class StringType implements Validator {
  constructor (
    readonly value: unknown,
    readonly fieldName?: string
  ) {}

  validate (): Error | undefined {
    if (this.value === null || this.value === undefined || typeof this.value === 'string') return undefined
    return new InvalidFieldTypeError(this.fieldName, 'string')
  }
}
