import { Controller, SavePictureController } from '@/application/controllers'
import { AllowedMimeTypes, FileSignature, MaxFileSize, Required, RequiredBuffer } from '@/application/validation'

describe('SavePictureController', () => {
  let sut: SavePictureController
  let mimeType: string
  let file: { buffer: Buffer, mimeType: string }
  let buffer: Buffer
  let changeProfilePicture: jest.Mock
  let userId: string

  beforeAll(() => {
    buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
    mimeType = 'image/png'
    file = { buffer, mimeType }
    userId = 'any_user_id'
    changeProfilePicture = jest.fn().mockResolvedValue({
      initials: 'any_initials',
      pictureUrl: 'any_url'
    })
  })

  beforeEach(() => {
    sut = new SavePictureController(changeProfilePicture)
  })

  it('Should extend Controller', async () => {
    expect(sut).toBeInstanceOf(Controller)
  })

  it('Should build Validators correctly on save', async () => {
    const validators = sut.buildValidators({ file, userId })

    expect(validators).toEqual([
      new Required(file, 'file'),
      new RequiredBuffer(buffer, 'file'),
      new AllowedMimeTypes(['png', 'jpg'], mimeType),
      new MaxFileSize(5, buffer),
      new FileSignature(['png', 'jpg'], buffer)
    ])
  })

  it('Should build Validators correctly on delete', async () => {
    const validators = sut.buildValidators({ file: undefined, userId })

    expect(validators).toEqual([])
  })

  it('should call ChangeProfilePicture with correct input', async () => {
    await sut.handle({ file, userId })

    expect(changeProfilePicture).toHaveBeenCalledWith({ userId, file })
    expect(changeProfilePicture).toHaveBeenCalledTimes(1)
  })

  it('should call 200 with valid data', async () => {
    const httpResponse = await sut.handle({ file, userId })

    expect(httpResponse).toEqual({
      statusCode: 200,
      data: {
        initials: 'any_initials',
        pictureUrl: 'any_url'
      }
    })
  })
})
