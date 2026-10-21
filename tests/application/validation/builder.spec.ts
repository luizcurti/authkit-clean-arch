import { AllowedMimeTypes, FileSignature, MaxFileSize, Required, RequiredBuffer, RequiredString, StringType } from '@/application/validation'
import { ValidatorBuilder } from '@/application/validation/builder'

describe('ValidationBuilder', () => {
  it('Should return a StringType after required', () => {
    const validators = ValidatorBuilder
      .of({ value: 123, fieldName: 'any_name' })
      .required()
      .string()
      .build()

    expect(validators).toStrictEqual([new Required(123, 'any_name'), new StringType(123, 'any_name')])
  })

  it('Should return a RequiredString', () => {
    const validators = ValidatorBuilder
      .of({ value: 'any_value', fieldName: 'any_name' })
      .required()
      .build()

    expect(validators).toEqual([new RequiredString('any_value', 'any_name')])
  })

  it('Should return a RequiredBuffer', () => {
    const buffer = Buffer.from('any_buffer')

    const validators = ValidatorBuilder
      .of({ value: buffer })
      .required()
      .build()

    expect(validators).toEqual([new RequiredBuffer(buffer)])
  })

  it('Should return a Required', () => {
    const validators = ValidatorBuilder
      .of({ value: { any: 'any' } })
      .required()
      .build()

    expect(validators).toEqual([new Required({ any: 'any' })])
  })

  it('Should return a Required', () => {
    const buffer = Buffer.from('any_buffer')

    const validators = ValidatorBuilder
      .of({ value: { buffer } })
      .required()
      .build()

    expect(validators).toEqual([
      new Required({ buffer }),
      new RequiredBuffer(buffer)
    ])
  })

  it('Should return correct image validators', () => {
    const buffer = Buffer.from('any_buffer')

    const validators = ValidatorBuilder
      .of({ value: { buffer } })
      .image({ allowed: ['png'], maxSizeInMb: 6 })
      .build()

    expect(validators).toEqual([
      new MaxFileSize(6, buffer),
      new FileSignature(['png'], buffer)
    ])
  })

  it.each([
    ['image/png', ['png']],
    ['image/jpeg', ['jpg']],
    ['image/gif', ['png', 'jpg']]
  ] as const)('Should expect the signature of the declared type %s when it is allowed', (mimeType, expected) => {
    const buffer = Buffer.from('any_buffer')

    const validators = ValidatorBuilder
      .of({ value: { buffer, mimeType } })
      .image({ allowed: ['png', 'jpg'], maxSizeInMb: 5 })
      .build()

    expect(validators).toEqual([
      new AllowedMimeTypes(['png', 'jpg'], mimeType),
      new MaxFileSize(5, buffer),
      new FileSignature([...expected], buffer)
    ])
  })

  it('Should return correct image validators', () => {
    const validators = ValidatorBuilder
      .of({ value: { mimeType: 'image/png' } })
      .image({ allowed: ['png'], maxSizeInMb: 6 })
      .build()

    expect(validators).toEqual([new AllowedMimeTypes(['png'], 'image/png')])
  })

  it('Should return correct image validators', () => {
    const buffer = Buffer.from('any_buffer')

    const validators = ValidatorBuilder
      .of({ value: { buffer, mimeType: 'image/png' } })
      .image({ allowed: ['png'], maxSizeInMb: 6 })
      .build()

    expect(validators).toEqual([
      new AllowedMimeTypes(['png'], 'image/png'),
      new MaxFileSize(6, buffer),
      new FileSignature(['png'], buffer)
    ])
  })
})
