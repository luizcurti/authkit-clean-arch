import { AwsS3FileStorage, AwsS3FileStorageConfig } from '@/infra/gateways/aws-s3-file-storage'
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

jest.mock('@aws-sdk/client-s3')
jest.mock('@aws-sdk/s3-request-presigner')

describe('AwsS3FileStorage', () => {
  let config: AwsS3FileStorageConfig
  let fileName: string
  let file: Buffer
  let sendSpy: jest.Mock
  let sut: AwsS3FileStorage

  beforeEach(() => {
    config = { accessKey: 'any_access_key', secret: 'any_secret', bucket: 'any_bucket', region: 'any_region' }
    fileName = 'any_file_name.png'
    file = Buffer.from('any_buffer')
    sendSpy = jest.fn()
    jest.mocked(S3Client).mockImplementation(() => ({ send: sendSpy }) as any)
    jest.mocked(getSignedUrl).mockResolvedValue('any_signed_url')
    sut = new AwsS3FileStorage(config)
  })

  describe('client configuration', () => {
    it('should use AWS with credentials and region by default', () => {
      expect(S3Client).toHaveBeenCalledWith({
        region: 'any_region',
        credentials: { accessKeyId: 'any_access_key', secretAccessKey: 'any_secret' }
      })
    })

    it('should target an S3-compatible endpoint with path-style addressing when configured', () => {
      new AwsS3FileStorage({ ...config, endpoint: 'http://s3mock:9090', forcePathStyle: true })

      expect(S3Client).toHaveBeenLastCalledWith(expect.objectContaining({
        endpoint: 'http://s3mock:9090',
        forcePathStyle: true
      }))
    })
  })

  describe('upload', () => {
    it('should put the object with its content type and no ACL', async () => {
      await sut.upload({ file, fileName, contentType: 'image/png' })

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'any_bucket',
        Key: fileName,
        Body: file,
        ContentType: 'image/png'
      })
      expect(jest.mocked(PutObjectCommand).mock.calls[0][0]).not.toHaveProperty('ACL')
      expect(sendSpy).toHaveBeenCalledTimes(1)
    })

    it('should rethrow if send throws', async () => {
      const error = new Error('upload_error')
      sendSpy.mockRejectedValueOnce(error)

      await expect(sut.upload({ file, fileName, contentType: 'image/png' })).rejects.toThrow(error)
    })
  })

  describe('delete', () => {
    it('should call send with a DeleteObjectCommand with correct input', async () => {
      await sut.delete({ fileName })

      expect(DeleteObjectCommand).toHaveBeenCalledWith({ Bucket: 'any_bucket', Key: fileName })
      expect(sendSpy).toHaveBeenCalledTimes(1)
    })

    it('should rethrow if send throws', async () => {
      const error = new Error('delete_error')
      sendSpy.mockRejectedValueOnce(error)

      await expect(sut.delete({ fileName })).rejects.toThrow(error)
    })
  })

  describe('getUrl', () => {
    it('should return a pre-signed GET URL valid for one hour by default', async () => {
      const url = await sut.getUrl({ fileName })

      expect(GetObjectCommand).toHaveBeenCalledWith({ Bucket: 'any_bucket', Key: fileName })
      expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.any(GetObjectCommand), { expiresIn: 3600 })
      expect(url).toBe('any_signed_url')
    })

    it('should honour a custom signed URL expiration', async () => {
      sut = new AwsS3FileStorage({ ...config, signedUrlExpiresInSeconds: 60 })

      await sut.getUrl({ fileName })

      expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), { expiresIn: 60 })
    })

    it('should build a URL from the public base URL (CDN) without signing when configured', async () => {
      sut = new AwsS3FileStorage({ ...config, publicBaseUrl: 'https://cdn.example.com/' })

      const url = await sut.getUrl({ fileName: 'any file.png' })

      expect(url).toBe('https://cdn.example.com/any%20file.png')
      expect(getSignedUrl).not.toHaveBeenCalled()
    })
  })
})
