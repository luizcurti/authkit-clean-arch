import { Required, RequiredBuffer, RequiredString, StringType, Validator, Extension } from '@/application/validation'
import { AllowedMimeTypes, extensionOf } from '@/application/validation/allowed-mime-types'
import { MaxFileSize } from './max-file-size'
import { FileSignature } from './file-signature'

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

  string (): ValidatorBuilder {
    this.validators.push(new StringType(this.value, this.fieldName))
    return this
  }

  image ({ allowed, maxSizeInMb }: { allowed: Extension[], maxSizeInMb: number }): ValidatorBuilder {
    const val = this.value as { mimeType?: string, buffer?: Buffer }
    if (val.mimeType !== undefined) this.validators.push(new AllowedMimeTypes(allowed, val.mimeType))
    if (val.buffer !== undefined) this.validators.push(new MaxFileSize(maxSizeInMb, val.buffer))
    if (val.buffer !== undefined) this.validators.push(new FileSignature(this.expectedSignatures(allowed, val.mimeType), val.buffer))
    return this
  }

  // The content must match the declared type when it is an allowed one, otherwise any allowed type
  private expectedSignatures (allowed: Extension[], mimeType?: string): Extension[] {
    const declared = mimeType === undefined ? undefined : extensionOf(mimeType)
    return declared !== undefined && allowed.includes(declared) ? [declared] : allowed
  }

  build (): Validator[] {
    return this.validators
  }
}
