import { DeleteFile, UploadFile } from '@/domain/contracts/gateways'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

export class AwsS3FileStorage implements UploadFile, DeleteFile {
  private readonly s3Client: S3Client

  constructor (
    accessKey: string,
    secret: string,
    private readonly bucket: string
  ) {
    this.s3Client = new S3Client({
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secret
      }
    })
  }

  async upload ({ file, fileName }: UploadFile.Input): Promise<UploadFile.Output> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileName,
      Body: file,
      ACL: 'public-read'
    })
    await this.s3Client.send(command)
    return `https://${this.bucket}.s3.amazonaws.com/${encodeURIComponent(fileName)}`
  }

  async delete ({ fileName }: DeleteFile.Input): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: fileName
    })
    await this.s3Client.send(command)
  }
}
