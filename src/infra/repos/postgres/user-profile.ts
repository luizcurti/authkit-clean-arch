import { SaveUserPicture } from '@/domain/contracts/repositories'
import { PgUser } from '@/infra/repos/postgres/entities'
import { LoadUserProfile } from '@/domain/contracts/repositories/user-profile'
import { PgRepository } from '@/infra/repos/postgres/repository'

type SaveInput = SaveUserPicture.Input
type LoadInput = LoadUserProfile.Input
type LoadOutput = LoadUserProfile.Output

export class PgUserProfileRepository extends PgRepository implements SaveUserPicture {
  async savePicture ({ id, pictureUrl, initials }: SaveInput): Promise<void> {
    const pgUserRepo = this.getRepository(PgUser)
    // Use null explicitly to clear fields in the database (undefined is ignored by TypeORM update)
    await pgUserRepo.update({ id: parseInt(id) }, {
      pictureUrl: (pictureUrl ?? null) as any,
      initials: (initials ?? null) as any
    })
  }

  async load ({ id }: LoadInput): Promise<LoadOutput> {
    const pgUserRepo = this.getRepository(PgUser)
    const pgUser = await pgUserRepo.findOneBy({ id: parseInt(id) })
    if (pgUser !== null && pgUser !== undefined) return { name: pgUser.name ?? undefined }
    return undefined
  }
}
