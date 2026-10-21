import { DeleteFile, GetFileUrl, UploadFile, UUIDGenerator } from '@/domain/contracts/gateways'
import { LoadUserProfile, SaveUserPicture } from '@/domain/contracts/repositories'
import { UserProfile } from '@/domain/entities/user-profile'
import { ConcurrentModificationError, UserNotFoundError } from '@/domain/entities/errors'

type Setup = (
  fileStorage: UploadFile & DeleteFile & GetFileUrl,
  idGenerator: UUIDGenerator,
  userProfileRepo: SaveUserPicture & LoadUserProfile
) => ChangeProfilePicture
type Input = { userId: string, file?: { buffer: Buffer, mimeType: string } }
type Output = { pictureUrl?: string, initials?: string }
export type ChangeProfilePicture = (input: Input) => Promise<Output>

// No transaction spans the upload. Consistency comes from the order (ADR-0016): upload under a fresh
// key, compare-and-set save that schedules deleting the replaced object, or delete the upload
export const setupChangeProfilePicture: Setup = (fileStorage, idGenerator, userProfileRepo) => async ({ userId, file }) => {
  const current = await userProfileRepo.load({ id: userId })
  // Before uploading, so nothing is stored for a missing user
  if (current === undefined) throw new UserNotFoundError()
  let pictureKey: string | undefined
  if (file !== undefined) {
    const fileExtension = file.mimeType.split('/')[1]
    pictureKey = `${idGenerator.uuid({ key: userId })}.${fileExtension}`
    await fileStorage.upload({ file: file.buffer, fileName: pictureKey, contentType: file.mimeType })
  }
  // Best-effort: an orphan is harmless and must not hide the original error
  const discardUpload = async (): Promise<void> => {
    if (pictureKey !== undefined) await fileStorage.delete({ fileName: pictureKey }).catch(() => undefined)
  }

  const userProfile = new UserProfile(userId)
  userProfile.setPicture({ pictureKey, name: current.name })
  let saved: boolean
  try {
    saved = await userProfileRepo.savePicture({
      id: userId,
      pictureKey: userProfile.pictureKey,
      initials: userProfile.initials,
      replacedPictureKey: current.pictureKey
    })
  } catch (error) {
    await discardUpload()
    throw error
  }
  if (!saved) {
    // Another request changed the picture after this one read it
    await discardUpload()
    throw new ConcurrentModificationError()
  }

  return {
    pictureUrl: pictureKey === undefined ? undefined : await fileStorage.getUrl({ fileName: pictureKey }),
    initials: userProfile.initials
  }
}
