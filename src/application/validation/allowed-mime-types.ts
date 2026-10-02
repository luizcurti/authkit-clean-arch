import { InvalidMimeTypeError } from '@/application/errors'
import { Validator } from '@/application/validation/validator'

export type Extension = 'png' | 'jpg'

export const extensionOf = (mimetype: string): Extension | undefined => {
  if (mimetype === 'image/png') return 'png'
  if (/image\/jpe?g/.test(mimetype)) return 'jpg'
  return undefined
}

export class AllowedMimeTypes implements Validator {
  constructor (
    private readonly allowed: Extension[],
    private readonly mimetype: string
  ) {}

  validate (): Error | undefined {
    const extension = extensionOf(this.mimetype)
    if (extension === undefined || !this.allowed.includes(extension)) return new InvalidMimeTypeError(this.allowed)
    return undefined
  }
}
