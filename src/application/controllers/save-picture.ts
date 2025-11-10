import { Controller } from '@/application/controllers/controller'
import { HttpResponse, ok } from '@/application/helpers'
import { Validator, ValidatorBuilder as Builder } from '@/application/validation'
import { ChangeProfilePicture } from '@/domain/use-cases'
import { SavePictureRequest, SavePictureResponse } from '@/application/dtos'

export class SavePictureController extends Controller<SavePictureRequest> {
  constructor (private readonly changeProfilePicture: ChangeProfilePicture) {
    super()
  }

  override async perform ({ file, userId }: SavePictureRequest): Promise<HttpResponse<SavePictureResponse>> {
    const { initials, pictureUrl } = await this.changeProfilePicture({ userId, file })
    return ok({ initials, pictureUrl })
  }

  override buildValidators ({ file }: SavePictureRequest): Validator[] {
    if (file === undefined) return []
    return [
      ...Builder.of({ value: file, fieldName: 'file' })
        .required()
        .image({ allowed: ['png', 'jpg'], maxSizeInMb: 5 })
        .build()
    ]
  }
}
