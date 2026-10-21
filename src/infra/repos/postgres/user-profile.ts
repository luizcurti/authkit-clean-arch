import { IsNull } from 'typeorm'
import { LoadUserProfile, SaveUserPicture } from '@/domain/contracts/repositories'
import { ProfilePictureReplaced } from '@/domain/entities'
import { PgOutboxEvent, PgUser } from '@/infra/repos/postgres/entities'
import { PgRepository } from '@/infra/repos/postgres/repository'

type SaveInput = SaveUserPicture.Input
type SaveOutput = SaveUserPicture.Output
type LoadInput = LoadUserProfile.Input
type LoadOutput = LoadUserProfile.Output

export class PgUserProfileRepository extends PgRepository implements SaveUserPicture, LoadUserProfile {
  async savePicture ({ id, pictureKey, initials, replacedPictureKey }: SaveInput): Promise<SaveOutput> {
    return this.transaction(async () => {
      // Compare-and-set on the key the caller read: of two concurrent changes only one matches.
      // null, not undefined: update() skips undefined properties
      const result = await this.getRepository(PgUser).update(
        { id: parseInt(id), pictureKey: replacedPictureKey ?? IsNull() },
        { pictureKey: pictureKey ?? null, initials: initials ?? null }
      )
      if (result.affected !== 1) return false
      if (replacedPictureKey !== undefined) {
        const event: ProfilePictureReplaced = { type: 'ProfilePictureReplaced', payload: { pictureKey: replacedPictureKey } }
        await this.getRepository(PgOutboxEvent).insert(event)
      }
      return true
    })
  }

  async load ({ id }: LoadInput): Promise<LoadOutput> {
    const pgUserRepo = this.getRepository(PgUser)
    const pgUser = await pgUserRepo.findOneBy({ id: parseInt(id) })
    if (pgUser !== null && pgUser !== undefined) {
      return { name: pgUser.name ?? undefined, pictureKey: pgUser.pictureKey ?? undefined }
    }
    return undefined
  }
}
