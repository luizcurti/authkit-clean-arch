import { LoadUserAccount, SaveFacebookAccount } from '@/domain/contracts/repositories'
import { AuthenticationError } from '@/domain/entities/errors'
import { PgUser } from '@/infra/repos/postgres/entities'
import { PgRepository } from '@/infra/repos/postgres/repository'

type LoadInput = LoadUserAccount.Input
type LoadOutput = LoadUserAccount.Output
type SaveInput = SaveFacebookAccount.Input
type SaveOutput = SaveFacebookAccount.Output

export class PgUserAccountRepository extends PgRepository implements LoadUserAccount, SaveFacebookAccount {
  async load ({ facebookId, email }: LoadInput): Promise<LoadOutput> {
    const pgUserRepo = this.getRepository(PgUser)
    const pgUser = await pgUserRepo.findOne({ where: { facebookId } }) ??
      await pgUserRepo.findOne({ where: { email } })
    if (pgUser != null) {
      return {
        id: pgUser.id.toString(),
        name: pgUser.name ?? undefined,
        facebookId: pgUser.facebookId ?? undefined
      }
    }
    return undefined
  }

  async saveWithFacebook ({ id, name, email, facebookId }: SaveInput): Promise<SaveOutput> {
    const pgUserRepo = this.getRepository(PgUser)
    if (id !== undefined) {
      // Compare-and-set on facebook_id: of two identities binding the same account, only one matches
      const result = await pgUserRepo.createQueryBuilder()
        .update(PgUser)
        .set({ name, facebookId })
        .where('"id" = :id', { id: parseInt(id) })
        .andWhere('("facebook_id" IS NULL OR "facebook_id" = :facebookId)', { facebookId })
        .execute()
      if (result.affected !== 1) throw new AuthenticationError()
      return { id }
    }
    // Concurrent first logins: ON CONFLICT links the loser to the winner's row. The WHERE refuses a
    // row bound to another Facebook identity
    const result = await pgUserRepo.createQueryBuilder()
      .insert()
      .into(PgUser)
      .values({ email, name, facebookId })
      .orUpdate(['facebook_id'], ['email'], {
        overwriteCondition: { where: '"users"."facebook_id" IS NULL OR "users"."facebook_id" = EXCLUDED."facebook_id"' }
      })
      .returning(['id'])
      .execute()
    const row = (result.raw as Array<{ id: number }>)[0]
    // No row: the email belongs to an account bound to another Facebook identity
    if (row === undefined) {
      throw new AuthenticationError()
    }
    return { id: row.id.toString() }
  }
}
