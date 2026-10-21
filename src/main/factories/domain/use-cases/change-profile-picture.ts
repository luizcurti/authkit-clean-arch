import { ChangeProfilePicture, setupChangeProfilePicture } from '@/domain/use-cases/change-profile-picture'
import { makeAwsS3FileStorage, makeUuidHandler } from '@/main/factories/infra/gateways'
import { makePgUserProfileRepository } from '@/main/factories/infra/repos/postgres'

export const makeChangeProfilePicture = (): ChangeProfilePicture => {
  return setupChangeProfilePicture(
    makeAwsS3FileStorage(),
    makeUuidHandler(),
    makePgUserProfileRepository()
  )
}
