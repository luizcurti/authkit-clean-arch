import { env } from '@/main/config/env'
import { AwsS3FileStorage } from '@/infra/gateways'

// Runs against S3Mock (S3_ENDPOINT) or real AWS credentials; skipped with neither
const PLACEHOLDER_ACCESS_KEYS = ['test_s3_access_key', 'your_aws_access_key_id']
const isConfigured = env.s3.endpoint !== undefined || !PLACEHOLDER_ACCESS_KEYS.includes(env.s3.accessKey)
const itIfConfigured = isConfigured ? it : it.skip

describe('AwsS3FileStorage against S3', () => {
  const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjODJF5T8ABhgCfM/XUK8AAAAASUVORK5CYII=', 'base64')
  let sut: AwsS3FileStorage

  beforeEach(() => {
    // Pre-signed URLs exercise signing and work for any bucket
    sut = new AwsS3FileStorage({ ...env.s3, publicBaseUrl: undefined })
  })

  itIfConfigured('uploads without an ACL, serves it through a pre-signed URL, then deletes it', async () => {
    const fileName = `integration-test-${Date.now()}.png`

    await sut.upload({ file: onePixelPng, fileName, contentType: 'image/png' })
    const url = await sut.getUrl({ fileName })
    const downloaded = await fetch(url)

    expect(downloaded.status).toBe(200)
    expect(downloaded.headers.get('content-type')).toBe('image/png')
    expect(Buffer.from(await downloaded.arrayBuffer())).toEqual(onePixelPng)

    await sut.delete({ fileName })

    expect((await fetch(await sut.getUrl({ fileName }))).status).toBe(404)
  })
})
