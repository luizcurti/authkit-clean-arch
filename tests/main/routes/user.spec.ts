import request from 'supertest'
import { IBackup } from 'pg-mem'
import { Repository } from 'typeorm'
import { sign } from 'jsonwebtoken'

import { makeFakeDb } from '@/tests/infra/repos/mocks'
import { app, ready } from '@/main/config/app'
import { PgUser } from '@/infra/repos/postgres/entities'
import { env } from '@/main/config/env'
import { PgConnection } from '@/infra/repos/postgres/helpers'

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

  beforeEach(() => {
    pgBackup.restore()
  })

  describe('DELETE /users/picture', () => {
    it('should return 403 if no authorization header is present', async () => {
      const { status } = await request(app)
        .delete('/api/users/picture')

      expect(status).toBe(403)
    })

    it('should return 403 with invalid token', async () => {
      const { status } = await request(app)
        .delete('/api/users/picture')
        .set({ authorization: 'invalid_token' })

      expect(status).toBe(403)
    })

    it('should return 200 with initials when user has name', async () => {
      const { id } = await pgUserRepo.save({ email: 'any_email', name: 'Lourivaldo Vasconcelos' })
      const authorization = sign({ key: id }, env.jwtSecret)

      const { status, body } = await request(app)
        .delete('/api/users/picture')
        .set({ authorization })

      expect(status).toBe(200)
      expect(body.initials).toBe('LV')
      expect(body.pictureUrl).toBeUndefined()
    })

    it('should return 200 with single initial when user has one-word name', async () => {
      const { id } = await pgUserRepo.save({ email: 'single@email.com', name: 'Lourivaldo' })
      const authorization = sign({ key: id }, env.jwtSecret)

      const { status, body } = await request(app)
        .delete('/api/users/picture')
        .set({ authorization })

      expect(status).toBe(200)
      expect(body.initials).toBe('L')
      expect(body.pictureUrl).toBeUndefined()
    })

    it('should return 200 with no initials when user has no name', async () => {
      const { id } = await pgUserRepo.save({ email: 'noname@email.com' })
      const authorization = sign({ key: id }, env.jwtSecret)

      const { status, body } = await request(app)
        .delete('/api/users/picture')
        .set({ authorization })

      expect(status).toBe(200)
      expect(body.initials).toBeUndefined()
      expect(body.pictureUrl).toBeUndefined()
    })

    it('should return 200 when authorization header uses the "Bearer <token>" scheme', async () => {
      const { id } = await pgUserRepo.save({ email: 'bearer@email.com', name: 'Bearer User' })
      const token = sign({ key: id }, env.jwtSecret)

      const { status, body } = await request(app)
        .delete('/api/users/picture')
        .set({ authorization: `Bearer ${token}` })

      expect(status).toBe(200)
      expect(body.initials).toBe('BU')
    })

    it('should return 200 and clear pictureUrl when user already has a picture', async () => {
      const { id } = await pgUserRepo.save({
        email: 'haspic@email.com',
        name: 'John Doe',
        pictureUrl: 'https://any-bucket.s3.amazonaws.com/old-pic.jpg'
      })
      const authorization = sign({ key: id }, env.jwtSecret)

      const { status, body } = await request(app)
        .delete('/api/users/picture')
        .set({ authorization })

      expect(status).toBe(200)
      expect(body.initials).toBe('JD')
      expect(body.pictureUrl).toBeUndefined()
      const updatedUser = await pgUserRepo.findOneBy({ id })
      expect(updatedUser?.pictureUrl).toBeNull()
    })
  })

  describe('PUT /users/picture', () => {
    const uploadSpy = jest.fn()
    const deleteSpy = jest.fn()

    jest.mock('@/infra/gateways/aws-s3-file-storage', () => ({
      AwsS3FileStorage: jest.fn().mockReturnValue({ upload: uploadSpy, delete: deleteSpy })
    }))

    it('should return 403 if no authorization header is present', async () => {
      const { status } = await request(app)
        .put('/api/users/picture')

      expect(status).toBe(403)
    })

    it('should return 403 with invalid token', async () => {
      const { status } = await request(app)
        .put('/api/users/picture')
        .set({ authorization: 'invalid_token' })

      expect(status).toBe(403)
    })

    it('should return 200 with pictureUrl on valid image upload', async () => {
      uploadSpy.mockResolvedValueOnce('https://bucket.s3.amazonaws.com/any_picture.png')
      const { id } = await pgUserRepo.save({ email: 'any_email', name: 'Lourivaldo Vasconcelos' })
      const authorization = sign({ key: id }, env.jwtSecret)

      const { status, body } = await request(app)
        .put('/api/users/picture')
        .set({ authorization })
        .attach('picture', Buffer.from('any_buffer'), { filename: 'pic.png', contentType: 'image/png' })

      expect(status).toBe(200)
      expect(body.pictureUrl).toBe('https://bucket.s3.amazonaws.com/any_picture.png')
      expect(body.initials).toBeUndefined()
    })

    it('should return 200 with pictureUrl on valid jpg upload', async () => {
      uploadSpy.mockResolvedValueOnce('https://bucket.s3.amazonaws.com/pic.jpg')
      const { id } = await pgUserRepo.save({ email: 'jpg@email.com', name: 'Any Name' })
      const authorization = sign({ key: id }, env.jwtSecret)

      const { status, body } = await request(app)
        .put('/api/users/picture')
        .set({ authorization })
        .attach('picture', Buffer.from('any_buffer'), { filename: 'pic.jpg', contentType: 'image/jpeg' })

      expect(status).toBe(200)
      expect(body.pictureUrl).toBeDefined()
    })

    it('should return 400 when uploading file with unsupported mime type', async () => {
      const { id } = await pgUserRepo.save({ email: 'gif@email.com', name: 'Any Name' })
      const authorization = sign({ key: id }, env.jwtSecret)

      const { status, body } = await request(app)
        .put('/api/users/picture')
        .set({ authorization })
        .attach('picture', Buffer.from('any_buffer'), { filename: 'pic.gif', contentType: 'image/gif' })

      expect(status).toBe(400)
      expect(body.error).toBeDefined()
    })

    it('should return 400 when file exceeds 5MB limit', async () => {
      const bigBuffer = Buffer.alloc(6 * 1024 * 1024) // 6MB
      const { id } = await pgUserRepo.save({ email: 'big@email.com', name: 'Any Name' })
      const authorization = sign({ key: id }, env.jwtSecret)

      const { status, body } = await request(app)
        .put('/api/users/picture')
        .set({ authorization })
        .attach('picture', bigBuffer, { filename: 'large.png', contentType: 'image/png' })

      expect(status).toBe(400)
      expect(body.error).toBeDefined()
    })

    it('should return 400 when no file is attached', async () => {
      const { id } = await pgUserRepo.save({ email: 'nofile@email.com', name: 'Any Name' })
      const authorization = sign({ key: id }, env.jwtSecret)

      const { status, body } = await request(app)
        .put('/api/users/picture')
        .set({ authorization })

      expect(status).toBe(400)
      expect(body.error).toBeDefined()
    })
  })
})
