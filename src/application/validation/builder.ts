import { Required, RequiredBuffer, RequiredString, Validator, Extension } from '@/application/validation'
import { AllowedMimeTypes } from '@/application/validation/allowed-mime-types'
import { MaxFileSize } from './max-file-size'

export class ValidatorBuilder {
  private constructor (
    private readonly value: unknown,
    private readonly fieldName?: string,
    private readonly validators: Validator[] = []
  ) {}

  static of ({ value, fieldName }: { value: unknown, fieldName?: string }): ValidatorBuilder {
    return new ValidatorBuilder(value, fieldName)
  }

  required (): ValidatorBuilder {
    if (this.value instanceof Buffer) {
      this.validators.push(new RequiredBuffer(this.value, this.fieldName))
    } else if (typeof this.value === 'string') {
      this.validators.push(new RequiredString(this.value, this.fieldName))
    } else {
      this.validators.push(new Required(this.value, this.fieldName))
      const val = this.value as { buffer?: Buffer }
      if (val?.buffer !== undefined) {
        this.validators.push(new RequiredBuffer(val.buffer, this.fieldName))
      }
    }
    return this
  }

  image ({ allowed, maxSizeInMb }: { allowed: Extension[], maxSizeInMb: number}): ValidatorBuilder {
    const val = this.value as { mimeType?: string, buffer?: Buffer }
    if (val.mimeType !== undefined) this.validators.push(new AllowedMimeTypes(allowed, val.mimeType))
    if (val.buffer !== undefined) this.validators.push(new MaxFileSize(maxSizeInMb, val.buffer))
    return this
  }

  build (): Validator[] {
    return this.validators
  }
}
