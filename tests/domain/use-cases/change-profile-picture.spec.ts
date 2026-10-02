import { mock, MockProxy } from 'jest-mock-extended'
import { DeleteFile, GetFileUrl, UploadFile, UUIDGenerator } from '@/domain/contracts/gateways'
import { ChangeProfilePicture, setupChangeProfilePicture } from '@/domain/use-cases/change-profile-picture'
import { LoadUserProfile, SaveUserPicture } from '@/domain/contracts/repositories'
import { ConcurrentModificationError, UserNotFoundError } from '@/domain/entities/errors'

describe('ChangeProfilePicture', () => {
  let uuid: string
  let buffer: Buffer
  let file: { buffer: Buffer, mimeType: string }
  let fileStorage: MockProxy<UploadFile & DeleteFile & GetFileUrl>
  let idGenerator: MockProxy<UUIDGenerator>
  let userProfileRepo: MockProxy<SaveUserPicture & LoadUserProfile>
  let sut: ChangeProfilePicture

  beforeEach(() => {
    uuid = 'any_unique_id'
    buffer = Buffer.from('any_buffer')
    file = { buffer, mimeType: 'image/png' }
    fileStorage = mock()
    fileStorage.upload.mockResolvedValue(undefined)
    fileStorage.delete.mockResolvedValue(undefined)
    fileStorage.getUrl.mockResolvedValue('any_url')
    idGenerator = mock()
    idGenerator.uuid.mockReturnValue(uuid)
    userProfileRepo = mock()
    userProfileRepo.load.mockResolvedValue({ name: 'Lourivaldo Coutinho Vasconcelos' })
    userProfileRepo.savePicture.mockResolvedValue(true)
    sut = setupChangeProfilePicture(fileStorage, idGenerator, userProfileRepo)
  })

  it('should load the current profile', async () => {
    await sut({ userId: 'any_id', file })

    expect(userProfileRepo.load).toHaveBeenCalledWith({ id: 'any_id' })
  })

  it.each([
    ['with', { buffer: Buffer.from('any_buffer'), mimeType: 'image/png' }],
    ['without', undefined]
  ])('should throw UserNotFoundError %s a file when the user does not exist, uploading and saving nothing', async (_, file) => {
    userProfileRepo.load.mockResolvedValueOnce(undefined)

    await expect(sut({ userId: 'any_id', file })).rejects.toThrow(new UserNotFoundError())

    expect(fileStorage.upload).not.toHaveBeenCalled()
    expect(userProfileRepo.savePicture).not.toHaveBeenCalled()
  })

  it.each([
    ['image/png', 'png'],
    ['image/jpeg', 'jpeg']
  ])('should upload a %s under a new random key with its extension and content type', async (mimeType, extension) => {
    await sut({ userId: 'any_id', file: { buffer, mimeType } })

    expect(idGenerator.uuid).toHaveBeenCalledWith({ key: 'any_id' })
    expect(fileStorage.upload).toHaveBeenCalledWith({ file: buffer, fileName: `${uuid}.${extension}`, contentType: mimeType })
    expect(fileStorage.upload).toHaveBeenCalledTimes(1)
  })

  it('should not upload when file is undefined', async () => {
    await sut({ userId: 'any_id', file: undefined })

    expect(fileStorage.upload).not.toHaveBeenCalled()
  })

  it('should save the uploaded picture key', async () => {
    await sut({ userId: 'any_id', file })

    expect(userProfileRepo.savePicture).toHaveBeenCalledWith(expect.objectContaining({ id: 'any_id', pictureKey: `${uuid}.png` }))
    expect(userProfileRepo.savePicture).toHaveBeenCalledTimes(1)
  })

  it('should save initials and no picture key when the picture is removed', async () => {
    await sut({ userId: 'any_id', file: undefined })

    expect(userProfileRepo.savePicture).toHaveBeenCalledWith(expect.objectContaining({ id: 'any_id', pictureKey: undefined, initials: 'LV' }))
  })

  it('should return the resolved URL of the uploaded picture', async () => {
    const result = await sut({ userId: 'any_id', file })

    expect(fileStorage.getUrl).toHaveBeenCalledWith({ fileName: `${uuid}.png` })
    expect(result).toEqual({ pictureUrl: 'any_url', initials: undefined })
  })

  it('should return initials and no URL when the picture is removed', async () => {
    const result = await sut({ userId: 'any_id', file: undefined })

    expect(fileStorage.getUrl).not.toHaveBeenCalled()
    expect(result).toEqual({ pictureUrl: undefined, initials: 'LV' })
  })

  describe('previous picture', () => {
    beforeEach(() => {
      userProfileRepo.load.mockResolvedValue({ name: 'any name', pictureKey: 'old_key.jpeg' })
    })

    it('should save with a compare-and-set on the picture key it read', async () => {
      await sut({ userId: 'any_id', file })

      expect(userProfileRepo.savePicture).toHaveBeenCalledWith({
        id: 'any_id',
        pictureKey: `${uuid}.png`,
        initials: undefined,
        replacedPictureKey: 'old_key.jpeg'
      })
    })

    it('should pass the picture key it read when removing the picture', async () => {
      await sut({ userId: 'any_id', file: undefined })

      expect(userProfileRepo.savePicture).toHaveBeenCalledWith(expect.objectContaining({ pictureKey: undefined, replacedPictureKey: 'old_key.jpeg' }))
    })

    // The repository schedules that deletion with the save (outbox)
    it('should never delete the previous picture itself', async () => {
      await sut({ userId: 'any_id', file })
      await sut({ userId: 'any_id', file: undefined })

      expect(fileStorage.delete).not.toHaveBeenCalled()
    })
  })

  it('should pass no replaced key when the profile had no picture', async () => {
    await sut({ userId: 'any_id', file })

    expect(userProfileRepo.savePicture).toHaveBeenCalledWith(expect.objectContaining({ replacedPictureKey: undefined }))
  })

  describe('when the profile changed concurrently', () => {
    beforeEach(() => {
      userProfileRepo.savePicture.mockResolvedValue(false)
    })

    it('should delete the just-uploaded object and throw ConcurrentModificationError', async () => {
      await expect(sut({ userId: 'any_id', file })).rejects.toThrow(new ConcurrentModificationError())

      expect(fileStorage.delete).toHaveBeenCalledWith({ fileName: `${uuid}.png` })
      expect(fileStorage.getUrl).not.toHaveBeenCalled()
    })

    it('should throw ConcurrentModificationError without deleting anything when there was no upload', async () => {
      await expect(sut({ userId: 'any_id', file: undefined })).rejects.toThrow(new ConcurrentModificationError())

      expect(fileStorage.delete).not.toHaveBeenCalled()
    })
  })

  describe('when saving the profile fails', () => {
    it('should delete the just-uploaded object, using the same key it was uploaded under, and rethrow', async () => {
      const error = new Error('save_error')
      userProfileRepo.savePicture.mockRejectedValueOnce(error)

      await expect(sut({ userId: 'any_id', file })).rejects.toThrow(error)

      const uploadedKey = fileStorage.upload.mock.calls[0][0].fileName
      expect(fileStorage.delete).toHaveBeenCalledWith({ fileName: uploadedKey })
      expect(fileStorage.delete).toHaveBeenCalledTimes(1)
    })

    it('should rethrow the save error even if deleting the upload also fails', async () => {
      const error = new Error('save_error')
      userProfileRepo.savePicture.mockRejectedValueOnce(error)
      fileStorage.delete.mockRejectedValueOnce(new Error('storage_error'))

      await expect(sut({ userId: 'any_id', file })).rejects.toThrow(error)
    })

    it('should not delete anything when there was no upload', async () => {
      userProfileRepo.savePicture.mockRejectedValueOnce(new Error('save_error'))

      await expect(sut({ userId: 'any_id', file: undefined })).rejects.toThrow()
      expect(fileStorage.delete).not.toHaveBeenCalled()
    })
  })
})
