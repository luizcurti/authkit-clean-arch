import { AwsS3FileStorage } from '@/infra/gateways'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

jest.mock('@aws-sdk/client-s3')

describe('AwsS3FileStorage', () => {
  let sut: AwsS3FileStorage
  let accessKey: string
  let secret: string
  let bucket: string
  let fileName: string
  let file: Buffer
  let sendSpy: jest.Mock

  beforeAll(() => {
    accessKey = 'any_access_key'
    secret = 'any_secret'
    bucket = 'any_bucket'
    fileName = 'any_file_name'
    file = Buffer.from('any_buffer')
  })

  beforeEach(() => {
    sendSpy = jest.fn()
    jest.mocked(S3Client).mockImplementation(() => ({ send: sendSpy }) as any)
    sut = new AwsS3FileStorage(accessKey, secret, bucket)
  })

  it('should config aws credentials on creation', () => {
    expect(sut).toBeDefined()
    expect(S3Client).toHaveBeenCalledWith({
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secret
      }
    })
    expect(S3Client).toHaveBeenCalledTimes(1)
  })

  describe('upload', () => {
    it('should call send with a PutObjectCommand with correct input', async () => {
      await sut.upload({ file, fileName })

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: bucket,
        Key: fileName,
        Body: file,
        ACL: 'public-read'
      })
      expect(sendSpy).toHaveBeenCalledTimes(1)
    })

    it('should return imageUrl', async () => {
      const imageUrl = await sut.upload({ fileName, file })

      expect(imageUrl).toBe(`https://${bucket}.s3.amazonaws.com/${fileName}`)
    })

    it('should return encoded imageUrl', async () => {
      const imageUrl = await sut.upload({ fileName: 'any file name', file })

      expect(imageUrl).toBe(`https://${bucket}.s3.amazonaws.com/any%20file%20name`)
    })

    it('should rethrow if send throws', async () => {
      const error = new Error('upload_error')
      sendSpy.mockRejectedValueOnce(error)

      const promise = sut.upload({ fileName, file })

      await expect(promise).rejects.toThrow(error)
    })
  })

  describe('delete', () => {
    it('should call send with a DeleteObjectCommand with correct input', async () => {
      await sut.delete({ fileName })

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: bucket,
        Key: fileName
      })
      expect(sendSpy).toHaveBeenCalledTimes(1)
    })

    it('should rethrow if send throws', async () => {
      const error = new Error('delete_error')
      sendSpy.mockRejectedValueOnce(error)

      const promise = sut.delete({ fileName })

      await expect(promise).rejects.toThrow(error)
    })
  })
})
