import { InvalidFileSignatureError } from '@/application/errors'
import { Validator } from '@/application/validation/validator'
import { Extension } from '@/application/validation/allowed-mime-types'

const SIGNATURES: Record<Extension, number[]> = {
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  jpg: [0xff, 0xd8, 0xff]
}

export class FileSignature implements Validator {
  constructor (
    private readonly allowed: Extension[],
    private readonly buffer: Buffer
  ) {}

  validate (): Error | undefined {
    const matches = this.allowed.some(extension => this.matchesSignature(extension))
    if (!matches) return new InvalidFileSignatureError()
    return undefined
  }

  private matchesSignature (extension: Extension): boolean {
    const signature = SIGNATURES[extension]
    return signature.every((byte, index) => this.buffer[index] === byte)
  }
}
