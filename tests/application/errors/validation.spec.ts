import { InvalidFieldTypeError } from '@/application/errors'

describe('Validation Errors', () => {
  describe('InvalidFieldTypeError', () => {
    it('should name the field and the expected type', () => {
      const sut = new InvalidFieldTypeError('token', 'string')

      expect(sut.message).toBe('The field token must be a string')
      expect(sut.name).toBe('InvalidFieldTypeError')
    })

    it('should fall back to a generic name without a field name', () => {
      expect(new InvalidFieldTypeError(undefined, 'string').message).toBe('The field value must be a string')
    })
  })
})
