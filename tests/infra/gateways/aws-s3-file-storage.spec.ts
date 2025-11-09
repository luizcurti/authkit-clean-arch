import { AwsS3FileStorage } from '@/infra/gateways'
import { S3Client } from '@aws-sdk/client-s3'

jest.mock('@aws-sdk/client-s3')

describe('AwsS3FileStorage', () => {
  let sut: AwsS3FileStorage
  let accessKey: string
  let secret: string
  let bucket: string
  let fileName: string
  let mockS3Client: jest.Mocked<S3Client>

  beforeAll(() => {
    accessKey = 'any_access_key'
    secret = 'any_secret'
    bucket = 'any_bucket'
    fileName = 'any_file_name'
  })

  beforeEach(() => {
    mockS3Client = {
      send: jest.fn()
    } as any
    mock(S3Client).mockImplementation(() => mockS3Client)
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
    let file: Buffer
    let putObjectPromiseSpy: jest.Mock
    let putObjectSpy: jest.Mock

    beforeAll(() => {
      file = Buffer.from('any_buffer')
      putObjectPromiseSpy = jest.fn()
      putObjectSpy = jest.fn().mockImplementation(() => ({ promise: putObjectPromiseSpy }))
      mock(S3).mockImplementation(jest.fn().mockImplementation(() => ({
        putObject: putObjectSpy
      })))
    })

    it('should call putObject with correct input', async () => {
      await sut.upload({ file, fileName })

      expect(putObjectSpy).toHaveBeenCalledWith({
        Bucket: bucket,
        Key: fileName,
        Body: file,
        ACL: 'public-read'
      })
      expect(putObjectSpy).toHaveBeenCalledTimes(1)
      expect(putObjectPromiseSpy).toHaveBeenCalledTimes(1)
    })

    it('should return imageUrl', async () => {
      const imageUrl = await sut.upload({ fileName, file })

      expect(imageUrl).toBe(`https://${bucket}.s3.amazonaws.com/${fileName}`)
    })

    it('should return encoded imageUrl', async () => {
      const imageUrl = await sut.upload({ fileName: 'any file name', file })

      expect(imageUrl).toBe(`https://${bucket}.s3.amazonaws.com/any%20file%20name`)
    })

    it('should rethrow if putObject throws', async () => {
      const error = new Error('upload_error')
      putObjectPromiseSpy.mockRejectedValueOnce(error)

      const promise = sut.upload({ fileName, file })

      await expect(promise).rejects.toThrow(error)
    })
  })

  describe('delete', () => {
    let deleteObjectPromiseSpy: jest.Mock
    let deleteObjectSpy: jest.Mock

    beforeAll(() => {
      deleteObjectPromiseSpy = jest.fn()
      deleteObjectSpy = jest.fn().mockImplementation(() => ({ promise: deleteObjectPromiseSpy }))
      mock(S3).mockImplementation(jest.fn().mockImplementation(() => ({
        deleteObject: deleteObjectSpy
      })))
    })

    it('should call deleteObject with correct input', async () => {
      await sut.delete({ fileName })

      expect(deleteObjectSpy).toHaveBeenCalledWith({
        Bucket: bucket,
        Key: fileName
      })
      expect(deleteObjectSpy).toHaveBeenCalledTimes(1)
      expect(deleteObjectPromiseSpy).toHaveBeenCalledTimes(1)
    })

    it('should rethrow if deleteObject throws', async () => {
      const error = new Error('delete_error')
      deleteObjectPromiseSpy.mockRejectedValueOnce(error)

      const promise = sut.delete({ fileName })

      await expect(promise).rejects.toThrow(error)
    })
  })
})
