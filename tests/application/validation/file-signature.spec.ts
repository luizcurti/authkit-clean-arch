import { InvalidFileSignatureError } from '@/application/errors'
import { FileSignature } from '@/application/validation'

describe('FileSignature', () => {
  const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
  const jpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
  const textBuffer = Buffer.from('any_buffer')

  it('should return undefined when buffer matches an allowed PNG signature', () => {
    const sut = new FileSignature(['png'], pngBuffer)

    const error = sut.validate()

    expect(error).toBeUndefined()
  })

  it('should return undefined when buffer matches an allowed JPG signature', () => {
    const sut = new FileSignature(['jpg'], jpgBuffer)

    const error = sut.validate()

    expect(error).toBeUndefined()
  })

  it('should return InvalidFileSignatureError when buffer does not match any allowed signature', () => {
    const sut = new FileSignature(['png', 'jpg'], textBuffer)

    const error = sut.validate()

    expect(error).toEqual(new InvalidFileSignatureError())
  })

  it('should return InvalidFileSignatureError when buffer matches a signature that is not allowed', () => {
    const sut = new FileSignature(['jpg'], pngBuffer)

    const error = sut.validate()

    expect(error).toEqual(new InvalidFileSignatureError())
  })

  it('should return InvalidFileSignatureError when buffer is shorter than the signature', () => {
    const sut = new FileSignature(['png'], Buffer.from([0x89, 0x50]))

    const error = sut.validate()

    expect(error).toEqual(new InvalidFileSignatureError())
  })
})
