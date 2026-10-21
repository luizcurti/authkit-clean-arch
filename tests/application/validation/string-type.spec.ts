import { InvalidFieldTypeError } from '@/application/errors'
import { StringType } from '@/application/validation'

describe('StringType', () => {
  it('should return undefined for a string', () => {
    expect(new StringType('any_value', 'any_field').validate()).toBeUndefined()
  })

  it('should return undefined for an empty string, which is for RequiredString to reject', () => {
    expect(new StringType('', 'any_field').validate()).toBeUndefined()
  })

  it.each([
    ['null', null],
    ['undefined', undefined]
  ])('should return undefined for %s, which is for Required to reject', (_, value) => {
    expect(new StringType(value, 'any_field').validate()).toBeUndefined()
  })

  it.each([
    ['a number', 123],
    ['a boolean', true],
    ['an object', { any: 'value' }],
    ['an array', ['any_value']]
  ])('should return InvalidFieldTypeError for %s', (_, value) => {
    expect(new StringType(value, 'any_field').validate()).toEqual(new InvalidFieldTypeError('any_field', 'string'))
  })
})
