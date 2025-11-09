import { ServerError } from '@/application/errors'
import { ValidationComposite } from '@/application/validation/composite'
import { Controller } from '@/application/controllers'
import { HttpResponse } from '@/application/helpers'
import { Validator } from '@/application/validation'

jest.mock('@/application/validation/composite')

class ControllerStub extends Controller {
  result: HttpResponse = {
    statusCode: 200,
    data: 'any_data'
  }

  validators: Validator[] = []

  async perform (_httpRequest: any): Promise<HttpResponse> {
    return this.result
  }

  buildValidators (_httpRequest: any): Validator[] {
    return this.validators
  }
}

describe('Controller', () => {
  let sut: ControllerStub
  let validationCompositeValidateSpy: jest.Mock

  beforeEach(() => {
    sut = new ControllerStub()
    validationCompositeValidateSpy = jest.fn().mockReturnValue(undefined)
    ;(ValidationComposite as jest.MockedClass<typeof ValidationComposite>).mockImplementation(() => ({
      validate: validationCompositeValidateSpy
    }) as any)
  })

  it('Should return 400 if validation fails', async () => {
    const error = new Error('validation_error')
    validationCompositeValidateSpy.mockReturnValueOnce(error)

    const httpResponse = await sut.handle('any_value')

    expect(ValidationComposite).toHaveBeenCalledWith([])
    expect(httpResponse).toEqual({
      statusCode: 400,
      data: error
    })
  })

  it('Should return 400 if validation fails with custom validators', async () => {
    const error = new Error('validation_error')
    const validator = { validate: jest.fn() } as any
    sut.validators = [validator]
    validationCompositeValidateSpy.mockReturnValueOnce(error)

    const httpResponse = await sut.handle('any_value')

    expect(ValidationComposite).toHaveBeenCalledWith([validator])
    expect(httpResponse).toEqual({
      statusCode: 400,
      data: error
    })
  })

  it('Should return 500 if perform throws', async () => {
    const error = new Error('perform_error')
    jest.spyOn(sut, 'perform').mockRejectedValueOnce(error)

    const httpResponse = await sut.handle('any_value')

    expect(httpResponse).toEqual({
      statusCode: 500,
      data: new ServerError(error)
    })
  })

  it('Should return 500 if perform throw a non Error object', async () => {
    jest.spyOn(sut, 'perform').mockRejectedValueOnce('perform_error')

    const httpResponse = await sut.handle('any_value')

    expect(httpResponse).toEqual({
      statusCode: 500,
      data: new ServerError()
    })
  })

  it('Should return same result as perform', async () => {
    const httpResponse = await sut.handle('any_value')

    expect(httpResponse).toEqual(sut.result)
  })
})
