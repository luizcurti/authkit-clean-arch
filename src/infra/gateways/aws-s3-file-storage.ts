import { DeleteFile, GetFileUrl, UploadFile } from '@/domain/contracts/gateways'
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export type AwsS3FileStorageConfig = {
  accessKey: string
  secret: string
  bucket: string
  region: string
  // S3-compatible endpoint (S3Mock). Unset = AWS
  endpoint?: string
  forcePathStyle?: boolean
  // Base URL objects are served from (CloudFront). Unset = pre-signed URLs
  publicBaseUrl?: string
  signedUrlExpiresInSeconds?: number
}

const DEFAULT_SIGNED_URL_EXPIRATION_IN_SECONDS = 60 * 60

// No ACLs (BucketOwnerEnforced buckets reject them): the bucket is private and read through the CDN or pre-signed URLs
export class AwsS3FileStorage implements UploadFile, DeleteFile, GetFileUrl {
  private readonly s3Client: S3Client

  constructor (private readonly config: AwsS3FileStorageConfig) {
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secret
      },
      ...(config.endpoint !== undefined && { endpoint: config.endpoint }),
      ...(config.forcePathStyle === true && { forcePathStyle: true })
    })
  }

  async upload ({ file, fileName, contentType }: UploadFile.Input): Promise<void> {
    await this.s3Client.send(new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: fileName,
      Body: file,
      ContentType: contentType
    }))
  }

  async delete ({ fileName }: DeleteFile.Input): Promise<void> {
    await this.s3Client.send(new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: fileName
    }))
  }

  async getUrl ({ fileName }: GetFileUrl.Input): Promise<GetFileUrl.Output> {
    if (this.config.publicBaseUrl !== undefined) {
      return `${this.config.publicBaseUrl.replace(/\/+$/, '')}/${encodeURIComponent(fileName)}`
    }
    const command = new GetObjectCommand({ Bucket: this.config.bucket, Key: fileName })
    return getSignedUrl(this.s3Client, command, {
      expiresIn: this.config.signedUrlExpiresInSeconds ?? DEFAULT_SIGNED_URL_EXPIRATION_IN_SECONDS
    })
  }
}
