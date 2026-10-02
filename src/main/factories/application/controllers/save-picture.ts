import { Controller, SavePictureController } from '@/application/controllers'
import { makeChangeProfilePicture } from '@/main/factories/domain/use-cases'

// No transaction: the upload must not hold a pooled connection. The use case stays consistent (ADR-0016)
export const makeSavePictureController = (): Controller => {
  return new SavePictureController(makeChangeProfilePicture())
}
