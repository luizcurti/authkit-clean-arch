import { InvalidMimeTypeError } from '@/application/errors'
import { AllowedMimeTypes, extensionOf } from '@/application/validation'

describe('AllowedMimeTypes', () => {
  it('should return InvalidMimeTypeError if value is invalid', () => {
    const sut = new AllowedMimeTypes(['png'], 'image/jpg')

    const error = sut.validate()

    expect(error).toEqual(new InvalidMimeTypeError(['png']))
  })

  it('should return undefined if value is valid', () => {
    const sut = new AllowedMimeTypes(['png'], 'image/png')

    const error = sut.validate()

    expect(error).toBeUndefined()
  })

  it('should return undefined if value is valid', () => {
    const sut = new AllowedMimeTypes(['jpg'], 'image/jpg')

    const error = sut.validate()

    expect(error).toBeUndefined()
  })

  it('should return undefined if value is valid', () => {
    const sut = new AllowedMimeTypes(['jpg'], 'image/jpeg')

    const error = sut.validate()

    expect(error).toBeUndefined()
  })
})

describe('AllowedMimeTypes with a type the API handles but this field does not allow', () => {
  it('should return InvalidMimeTypeError', () => {
    expect(new AllowedMimeTypes(['jpg'], 'image/png').validate()).toEqual(new InvalidMimeTypeError(['jpg']))
  })
})

describe('extensionOf', () => {
  it.each([
    ['image/png', 'png'],
    ['image/jpeg', 'jpg'],
    ['image/jpg', 'jpg'],
    ['image/gif', undefined],
    ['text/plain', undefined],
    ['', undefined]
  ])('should map %p to %p', (mimeType, extension) => {
    expect(extensionOf(mimeType)).toBe(extension)
  })
})
