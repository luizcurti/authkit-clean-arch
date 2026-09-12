import axios from 'axios'
import { env } from '@/main/config/env'
import { AwsS3FileStorage } from '@/infra/gateways'

// This test needs a real S3 bucket + credentials. When only the dev/placeholder
// defaults from env.ts or .env.example are present, skip instead of failing on
// an AWS error that just means "not configured", not "broken".
const PLACEHOLDER_ACCESS_KEYS = ['test_s3_access_key', 'your_aws_access_key_id']
const hasRealCredentials = !PLACEHOLDER_ACCESS_KEYS.includes(env.s3.accessKey)

describe('AWS S3 Integration Tests', () => {
  let sut: AwsS3FileStorage

  beforeEach(() => {
    sut = new AwsS3FileStorage(
      env.s3.accessKey,
      env.s3.secret,
      env.s3.bucket,
      env.s3.region
    )
  })

  const itIfCredentialsProvided = hasRealCredentials ? it : it.skip

  itIfCredentialsProvided('should upload and delete image from AWS s3', async () => {
    const onePixelImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjODJF5T8ABhgCfM/XUK8AAAAASUVORK5CYII='
    const file = Buffer.from(onePixelImage, 'base64')
    const fileName = 'any_file_name.png'

    const pictureUrl = await sut.upload({ fileName, file })

    expect((await axios.get(pictureUrl)).status).toEqual(200)

    await sut.delete({ fileName })

    await expect(axios.get(pictureUrl)).rejects.toThrow()
  })
})
