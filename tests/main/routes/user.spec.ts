import request from 'supertest'
import { IBackup } from 'pg-mem'
import { Repository } from 'typeorm'
import { sign } from 'jsonwebtoken'
import MockDate from 'mockdate'

import { makeFakeDb } from '@/tests/infra/repos/mocks'
import { app, ready } from '@/main/config/app'
import { PgOutboxEvent, PgUser } from '@/infra/repos/postgres/entities'
import { env } from '@/main/config/env'
import { PgConnection } from '@/infra/repos/postgres/helpers'
import { makeAuthorization } from '@/tests/main/mocks/authorization'
import { PgUserProfileRepository } from '@/infra/repos/postgres'

const uploadSpy = jest.fn()
const deleteSpy = jest.fn()
const getUrlSpy = jest.fn()

jest.mock('@/infra/gateways/aws-s3-file-storage', () => ({
  AwsS3FileStorage: jest.fn().mockReturnValue({ upload: uploadSpy, delete: deleteSpy, getUrl: getUrlSpy })
}))

describe('User Routes', () => {
  let pgBackup: IBackup
  let connection: PgConnection
  let pgUserRepo: Repository<PgUser>

  beforeAll(async () => {
    await ready
    connection = PgConnection.getInstance()
    const db = await makeFakeDb()
    pgBackup = db.backup()
    pgUserRepo = connection.getRepository(PgUser)
  })

  afterAll(async () => {
    if (connection !== undefined) await connection.disconnect()
  })

  afterEach(() => {
    MockDate.reset()
    jest.restoreAllMocks()
  })

  beforeEach(() => {
    pgBackup.restore()
    uploadSpy.mockReset().mockResolvedValue(undefined)
    deleteSpy.mockReset().mockResolvedValue(undefined)
    getUrlSpy.mockReset().mockImplementation(async ({ fileName }: { fileName: string }) => `https://cdn.example.com/${fileName}`)
  })

  describe('DELETE /users/picture', () => {
    it('should return 401 if no authorization header is present', async () => {
      const { status } = await request(app)
        .delete('/api/users/picture')

      expect(status).toBe(401)
    })

    it('should return 401 with invalid token', async () => {
      const { status } = await request(app)
        .delete('/api/users/picture')
        .set({ authorization: 'invalid_token' })

      expect(status).toBe(401)
    })

    it('should return 200 with initials when user has name', async () => {
      const { id } = await pgUserRepo.save({ email: 'any_email', name: 'Lourivaldo Vasconcelos' })
      const authorization = await makeAuthorization(id)

      const { status, body } = await request(app)
        .delete('/api/users/picture')
        .set({ authorization })

      expect(status).toBe(200)
      expect(body.initials).toBe('LV')
      expect(body.pictureUrl).toBeUndefined()
    })

    it('should return 200 with single initial when user has one-word name', async () => {
      const { id } = await pgUserRepo.save({ email: 'single@email.com', name: 'Lourivaldo' })
      const authorization = await makeAuthorization(id)

      const { status, body } = await request(app)
        .delete('/api/users/picture')
        .set({ authorization })

      expect(status).toBe(200)
      expect(body.initials).toBe('L')
      expect(body.pictureUrl).toBeUndefined()
    })

    it('should return 200 with no initials when user has no name', async () => {
      const { id } = await pgUserRepo.save({ email: 'noname@email.com' })
      const authorization = await makeAuthorization(id)

      const { status, body } = await request(app)
        .delete('/api/users/picture')
        .set({ authorization })

      expect(status).toBe(200)
      expect(body.initials).toBeUndefined()
      expect(body.pictureUrl).toBeUndefined()
    })

    it('should return 401 when a valid token is sent without the "Bearer" scheme', async () => {
      const { id } = await pgUserRepo.save({ email: 'bearer@email.com', name: 'Bearer User' })
      const authorization = await makeAuthorization(id)

      const { status } = await request(app)
        .delete('/api/users/picture')
        .set({ authorization: authorization.replace(/^Bearer /, '') })

      expect(status).toBe(401)
    })

    it('should return 401 when the token was signed with the right secret but a different audience', async () => {
      const { id } = await pgUserRepo.save({ email: 'aud@email.com', name: 'Aud User' })
      const token = sign({}, env.jwt.secret, { subject: id.toString(), issuer: env.jwt.issuer, audience: 'another-api' })

      const { status } = await request(app)
        .delete('/api/users/picture')
        .set({ authorization: `Bearer ${token}` })

      expect(status).toBe(401)
    })

    it('should return 200, clear the picture and schedule deleting the stored object when user already has a picture', async () => {
      const { id } = await pgUserRepo.save({
        email: 'haspic@email.com',
        name: 'John Doe',
        pictureKey: 'old-pic.jpg'
      })
      const authorization = await makeAuthorization(id)

      const { status, body } = await request(app)
        .delete('/api/users/picture')
        .set({ authorization })

      expect(status).toBe(200)
      expect(body.initials).toBe('JD')
      expect(body.pictureUrl).toBeUndefined()
      const updatedUser = await pgUserRepo.findOneBy({ id })
      expect(updatedUser?.pictureKey).toBeNull()
      // The outbox worker deletes it (ADR-0016)
      expect(deleteSpy).not.toHaveBeenCalled()
      const events = await connection.getRepository(PgOutboxEvent).find()
      expect(events).toEqual([expect.objectContaining({ type: 'ProfilePictureReplaced', payload: { pictureKey: 'old-pic.jpg' } })])
    })
  })

  describe('PUT /users/picture', () => {

    it('should return 401 if no authorization header is present', async () => {
      const { status } = await request(app)
        .put('/api/users/picture')

      expect(status).toBe(401)
    })

    it('should return 401 with invalid token', async () => {
      const { status } = await request(app)
        .put('/api/users/picture')
        .set({ authorization: 'invalid_token' })

      expect(status).toBe(401)
    })

    it('should return 200 with pictureUrl on valid image upload', async () => {
      const { id } = await pgUserRepo.save({ email: 'any_email', name: 'Lourivaldo Vasconcelos' })
      const authorization = await makeAuthorization(id)
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])

      const { status, body } = await request(app)
        .put('/api/users/picture')
        .set({ authorization })
        .attach('picture', pngBuffer, { filename: 'pic.png', contentType: 'image/png' })
      expect(status).toBe(200)
      const { fileName: storedKey, contentType } = uploadSpy.mock.calls[0][0]
      expect(storedKey).toMatch(new RegExp(`^${id}_[0-9a-f-]{36}\\.png$`))
      expect(contentType).toBe('image/png')
      expect(body.pictureUrl).toBe(`https://cdn.example.com/${storedKey as string}`)
      expect(body.initials).toBeUndefined()
      expect((await pgUserRepo.findOneBy({ id }))?.pictureKey).toBe(storedKey)
    })

    it('should schedule deleting the previous picture when replacing it', async () => {
      const { id } = await pgUserRepo.save({ email: 'replace@email.com', name: 'Any Name', pictureKey: 'previous.png' })
      const authorization = await makeAuthorization(id)
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])

      const { status } = await request(app)
        .put('/api/users/picture')
        .set({ authorization })
        .attach('picture', pngBuffer, { filename: 'pic.png', contentType: 'image/png' })

      expect(status).toBe(200)
      expect(deleteSpy).not.toHaveBeenCalled()
      const events = await connection.getRepository(PgOutboxEvent).find()
      expect(events).toEqual([expect.objectContaining({ type: 'ProfilePictureReplaced', payload: { pictureKey: 'previous.png' } })])
    })

    it('should return 200 with pictureUrl on valid jpg upload', async () => {
      const { id } = await pgUserRepo.save({ email: 'jpg@email.com', name: 'Any Name' })
      const authorization = await makeAuthorization(id)
      const jpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])

      const { status, body } = await request(app)
        .put('/api/users/picture')
        .set({ authorization })
        .attach('picture', jpgBuffer, { filename: 'pic.jpg', contentType: 'image/jpeg' })

      expect(status).toBe(200)
      expect(body.pictureUrl).toBeDefined()
    })

    it('should return 400 when file content does not match its declared mime type', async () => {
      const { id } = await pgUserRepo.save({ email: 'spoofed@email.com', name: 'Any Name' })
      const authorization = await makeAuthorization(id)

      const { status, body } = await request(app)
        .put('/api/users/picture')
        .set({ authorization })
        .attach('picture', Buffer.from('any_buffer'), { filename: 'pic.png', contentType: 'image/png' })

      expect(status).toBe(400)
      expect(body.error).toBeDefined()
    })

    it('should return 400 when uploading file with unsupported mime type', async () => {
      const { id } = await pgUserRepo.save({ email: 'gif@email.com', name: 'Any Name' })
      const authorization = await makeAuthorization(id)

      const { status, body } = await request(app)
        .put('/api/users/picture')
        .set({ authorization })
        .attach('picture', Buffer.from('any_buffer'), { filename: 'pic.gif', contentType: 'image/gif' })

      expect(status).toBe(400)
      expect(body.error).toBeDefined()
    })

    it('should return 400 when file exceeds 5MB limit', async () => {
      const bigBuffer = Buffer.alloc(6 * 1024 * 1024)
      const { id } = await pgUserRepo.save({ email: 'big@email.com', name: 'Any Name' })
      const authorization = await makeAuthorization(id)

      const { status, body } = await request(app)
        .put('/api/users/picture')
        .set({ authorization })
        .attach('picture', bigBuffer, { filename: 'large.png', contentType: 'image/png' })

      expect(status).toBe(400)
      expect(body.error).toBeDefined()
    })

    it('should return 400 when no file is attached', async () => {
      const { id } = await pgUserRepo.save({ email: 'nofile@email.com', name: 'Any Name' })
      const authorization = await makeAuthorization(id)

      const { status, body } = await request(app)
        .put('/api/users/picture')
        .set({ authorization })

      expect(status).toBe(400)
      expect(body.error).toBeDefined()
    })
  })
  const png = (size = 10): Buffer => {
    const buffer = Buffer.alloc(size)
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer)
    return buffer
  }
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
  const outboxEvents = async (): Promise<PgOutboxEvent[]> => connection.getRepository(PgOutboxEvent).find()

  // Both routes share the authentication middleware
  describe.each([
    ['DELETE', (authorization?: string) => {
      const req = request(app).delete('/api/users/picture')
      return authorization === undefined ? req : req.set({ authorization })
    }],
    ['PUT', (authorization?: string) => {
      const req = request(app).put('/api/users/picture')
      return (authorization === undefined ? req : req.set({ authorization })).attach('picture', png(), { filename: 'pic.png', contentType: 'image/png' })
    }]
  ])('%s /users/picture authentication', (_, send) => {
    const signWith = (options: { secret?: string, issuer?: string, audience?: string, expiresIn?: number, subject?: string } = {}): string =>
      sign({}, options.secret ?? env.jwt.secret, {
        subject: options.subject ?? '1',
        issuer: options.issuer ?? env.jwt.issuer,
        audience: options.audience ?? env.jwt.audience,
        expiresIn: options.expiresIn ?? 60
      })

    it('should answer a missing header with a bare Bearer challenge and the JSON error', async () => {
      const { status, headers, body } = await send()

      expect(status).toBe(401)
      expect(headers['www-authenticate']).toBe('Bearer')
      expect(body).toEqual({ error: 'unauthorized', requestId: expect.any(String) })
      expect(uploadSpy).not.toHaveBeenCalled()
    })

    it.each([
      ['an empty header', ''],
      ['the scheme without a token', 'Bearer '],
      ['another scheme', 'Basic dXNlcjpwYXNz'],
      ['a token with spaces', 'Bearer a b']
    ])('should answer %s with a bare Bearer challenge', async (_, authorization) => {
      const { status, headers } = await send(authorization)

      expect(status).toBe(401)
      expect(headers['www-authenticate']).toBe('Bearer')
    })

    it.each([
      ['a malformed token', () => 'Bearer not.a.jwt'],
      ['an expired token', () => `Bearer ${signWith({ expiresIn: -10 })}`],
      ['a token signed with another secret', () => `Bearer ${signWith({ secret: 'another_secret_with_enough_length_123' })}`],
      ['a token from another issuer', () => `Bearer ${signWith({ issuer: 'another-issuer' })}`],
      ['a token for another audience', () => `Bearer ${signWith({ audience: 'another-api' })}`],
      ['an unsigned (alg none) token', () => `Bearer ${sign({ sub: '1', iss: env.jwt.issuer, aud: env.jwt.audience }, '', { algorithm: 'none' })}`]
    ])('should reject %s with an invalid_token challenge', async (_, authorization) => {
      const { status, headers, body } = await send(authorization())

      expect(status).toBe(401)
      expect(headers['www-authenticate']).toBe('Bearer error="invalid_token"')
      expect(body).toEqual({ error: 'unauthorized', requestId: expect.any(String) })
      expect(uploadSpy).not.toHaveBeenCalled()
    })

    it('should reject a token that expired while it was being used', async () => {
      const { id } = await pgUserRepo.save({ email: 'expiring@email.com', name: 'Any Name' })
      const authorization = await makeAuthorization(id, 1000)
      MockDate.set(Date.now() + 2000)

      const { status } = await send(authorization)

      expect(status).toBe(401)
    })

    it('should accept the scheme in any case', async () => {
      const { id } = await pgUserRepo.save({ email: 'case@email.com', name: 'Any Name' })
      const authorization = (await makeAuthorization(id)).replace(/^Bearer/, 'bEaReR')

      const { status } = await send(authorization)

      expect(status).toBe(200)
    })

    it('should answer 404 for a valid token whose user does not exist, storing nothing', async () => {
      const { status, body } = await send(await makeAuthorization(999))

      expect(status).toBe(404)
      expect(body).toEqual({ error: 'User not found', requestId: expect.any(String) })
      expect(uploadSpy).not.toHaveBeenCalled()
      expect(await outboxEvents()).toEqual([])
    })

    it('should answer 409 and change nothing when the picture changed concurrently', async () => {
      const { id } = await pgUserRepo.save({ email: 'race@email.com', name: 'Any Name', pictureKey: 'current.png' })
      jest.spyOn(PgUserProfileRepository.prototype, 'savePicture').mockResolvedValueOnce(false)

      const { status, body } = await send(await makeAuthorization(id))

      expect(status).toBe(409)
      expect(body).toEqual({ error: 'The resource was modified by another request. Retry', requestId: expect.any(String) })
      expect((await pgUserRepo.findOneBy({ id }))?.pictureKey).toBe('current.png')
      expect(await outboxEvents()).toEqual([])
    })

    it('should answer a database failure with a generic 500, changing nothing', async () => {
      const { id } = await pgUserRepo.save({ email: 'dbdown@email.com', name: 'Any Name', pictureKey: 'current.png' })
      jest.spyOn(PgUserProfileRepository.prototype, 'savePicture').mockRejectedValueOnce(new Error('connection terminated'))

      const { status, body } = await send(await makeAuthorization(id))

      expect(status).toBe(500)
      expect(body).toEqual({ error: 'Server failed. Try again later', requestId: expect.any(String) })
      expect((await pgUserRepo.findOneBy({ id }))?.pictureKey).toBe('current.png')
    })

    it('should echo the X-Request-Id it was given', async () => {
      const { headers, body } = await send().set('X-Request-Id', 'client-request-id')

      expect(headers['x-request-id']).toBe('client-request-id')
      expect(body.requestId).toBe('client-request-id')
    })
  })

  describe('DELETE /users/picture outputs', () => {
    it('should answer exactly the initials, with no outbox event when there was no picture', async () => {
      const { id } = await pgUserRepo.save({ email: 'nopic@email.com', name: 'Ana Maria Braga' })

      const { status, headers, body } = await request(app).delete('/api/users/picture').set({ authorization: await makeAuthorization(id) })

      expect(status).toBe(200)
      expect(headers['content-type']).toContain('application/json')
      expect(body).toEqual({ initials: 'AB' })
      expect(await outboxEvents()).toEqual([])
      expect(await pgUserRepo.findOneBy({ id })).toMatchObject({ pictureKey: null, initials: 'AB' })
    })

    it('should be repeatable: deleting an already deleted picture answers the same', async () => {
      const { id } = await pgUserRepo.save({ email: 'twice@email.com', name: 'Any Name', pictureKey: 'old.png' })
      const authorization = await makeAuthorization(id)

      await request(app).delete('/api/users/picture').set({ authorization })
      const { status, body } = await request(app).delete('/api/users/picture').set({ authorization })

      expect(status).toBe(200)
      expect(body).toEqual({ initials: 'AN' })
      expect(await outboxEvents()).toHaveLength(1)
    })
  })

  describe('PUT /users/picture inputs and outputs', () => {
    let authorization: string
    let userId: number

    beforeEach(async () => {
      const { id } = await pgUserRepo.save({ email: 'upload@email.com', name: 'Any Name' })
      userId = id
      authorization = await makeAuthorization(id)
    })

    const upload = () => request(app).put('/api/users/picture').set({ authorization })

    it('should answer exactly the picture URL, and store the object under its declared content type', async () => {
      const { status, headers, body } = await upload().attach('picture', jpg, { filename: 'photo.jpg', contentType: 'image/jpeg' })

      expect(status).toBe(200)
      expect(headers['content-type']).toContain('application/json')
      const { fileName } = uploadSpy.mock.calls[0][0]
      expect(fileName).toMatch(new RegExp(`^${userId}_[0-9a-f-]{36}\\.jpeg$`))
      expect(uploadSpy).toHaveBeenCalledWith({ file: jpg, fileName, contentType: 'image/jpeg' })
      expect(body).toEqual({ pictureUrl: `https://cdn.example.com/${fileName as string}` })
      expect(await pgUserRepo.findOneBy({ id: userId })).toMatchObject({ pictureKey: fileName, initials: null })
    })

    it('should store a new key on every upload, so a cached URL never shows another picture', async () => {
      await upload().attach('picture', png(), { filename: 'a.png', contentType: 'image/png' })
      await upload().attach('picture', png(), { filename: 'b.png', contentType: 'image/png' })

      const [first, second] = uploadSpy.mock.calls.map(call => call[0].fileName)
      expect(first).not.toBe(second)
      expect(await outboxEvents()).toEqual([expect.objectContaining({ payload: { pictureKey: first } })])
    })

    it('should accept a file of exactly 5MB', async () => {
      const { status } = await upload().attach('picture', png(5 * 1024 * 1024), { filename: 'max.png', contentType: 'image/png' })

      expect(status).toBe(200)
    })

    it('should reject a file one byte over 5MB without storing it', async () => {
      const { status, body } = await upload().attach('picture', png(5 * 1024 * 1024 + 1), { filename: 'big.png', contentType: 'image/png' })

      expect(status).toBe(400)
      expect(body).toEqual({ error: 'File too large. Maximum size is 5MB.', requestId: expect.any(String) })
      expect(uploadSpy).not.toHaveBeenCalled()
    })

    it.each([
      ['a JPEG declared as PNG', jpg, 'image/png'],
      ['a PNG declared as JPEG', png(), 'image/jpeg'],
      ['text declared as PNG', Buffer.from('not an image'), 'image/png']
    ])('should reject %s', async (_, content, contentType) => {
      const { status, body } = await upload().attach('picture', content, { filename: 'pic', contentType })

      expect(status).toBe(400)
      expect(body).toEqual({ error: 'File content does not match its declared type', requestId: expect.any(String) })
      expect(uploadSpy).not.toHaveBeenCalled()
    })

    it.each(['image/gif', 'image/webp', 'application/pdf', 'text/plain'])('should reject the type %s', async (contentType) => {
      const { status, body } = await upload().attach('picture', png(), { filename: 'pic', contentType })

      expect(status).toBe(400)
      expect(body).toEqual({ error: 'Unsupported type. Allowed types: png, jpg', requestId: expect.any(String) })
    })

    it('should reject an empty file', async () => {
      const { status, body } = await upload().attach('picture', Buffer.alloc(0), { filename: 'empty.png', contentType: 'image/png' })

      expect(status).toBe(400)
      expect(body).toEqual({ error: 'The field file is required', requestId: expect.any(String) })
    })

    it('should reject a file sent under another field name', async () => {
      const { status, body } = await upload().attach('photo', png(), { filename: 'pic.png', contentType: 'image/png' })

      expect(status).toBe(400)
      expect(body).toEqual({ error: 'Invalid upload: Unexpected file field', requestId: expect.any(String) })
      expect(uploadSpy).not.toHaveBeenCalled()
    })

    it('should reject two files in the picture field', async () => {
      const { status, body } = await upload()
        .attach('picture', png(), { filename: 'a.png', contentType: 'image/png' })
        .attach('picture', png(), { filename: 'b.png', contentType: 'image/png' })

      expect(status).toBe(400)
      expect(body).toEqual({ error: 'Invalid upload: Unexpected file field', requestId: expect.any(String) })
      expect(uploadSpy).not.toHaveBeenCalled()
    })

    it('should ignore extra text fields next to the picture', async () => {
      const { status } = await upload().field('userId', '999').attach('picture', png(), { filename: 'pic.png', contentType: 'image/png' })

      expect(status).toBe(200)
      expect(uploadSpy.mock.calls[0][0].fileName).toMatch(new RegExp(`^${userId}_`))
    })

    it('should answer a JSON body with the missing file error', async () => {
      const { status, body } = await upload().send({ picture: 'base64...' })

      expect(status).toBe(400)
      expect(body).toEqual({ error: 'The field file is required', requestId: expect.any(String) })
    })

    it('should answer a truncated multipart body with a 400', async () => {
      const { status, body } = await upload()
        .set('Content-Type', 'multipart/form-data; boundary=xyz')
        .send('--xyz\r\nContent-Disposition: form-data; name="picture"; filename="a.png"\r\nContent-Type: image/png\r\n\r\n\x89PNG')

      expect(status).toBe(400)
      expect(body).toEqual({ error: expect.stringMatching(/^Invalid upload: /), requestId: expect.any(String) })
    })

    it('should answer a storage failure with a generic 500, leaving the profile unchanged', async () => {
      uploadSpy.mockRejectedValueOnce(new Error('S3 is down'))

      const { status, body } = await upload().attach('picture', png(), { filename: 'pic.png', contentType: 'image/png' })

      expect(status).toBe(500)
      expect(body).toEqual({ error: 'Server failed. Try again later', requestId: expect.any(String) })
      expect((await pgUserRepo.findOneBy({ id: userId }))?.pictureKey).toBeNull()
    })

    it('should delete the object it just uploaded when the profile changed concurrently', async () => {
      jest.spyOn(PgUserProfileRepository.prototype, 'savePicture').mockResolvedValueOnce(false)

      const { status } = await upload().attach('picture', png(), { filename: 'pic.png', contentType: 'image/png' })

      expect(status).toBe(409)
      expect(deleteSpy).toHaveBeenCalledWith({ fileName: uploadSpy.mock.calls[0][0].fileName })
    })
  })
})
