import { PgUser } from '@/infra/repos/postgres/entities'

describe('PgUser', () => {
  it('should create a PgUser instance', () => {
    const sut = new PgUser()

    expect(sut).toBeInstanceOf(PgUser)
  })

  it('should have correct properties', () => {
    const sut = new PgUser()
    sut.id = 1
    sut.name = 'any_name'
    sut.email = 'any_email@email.com'
    sut.facebookId = 'any_facebook_id'
    sut.pictureUrl = 'any_picture_url'
    sut.initials = 'AN'

    expect(sut.id).toBe(1)
    expect(sut.name).toBe('any_name')
    expect(sut.email).toBe('any_email@email.com')
    expect(sut.facebookId).toBe('any_facebook_id')
    expect(sut.pictureUrl).toBe('any_picture_url')
    expect(sut.initials).toBe('AN')
  })

  it('should return plain object via toPlain()', () => {
    const sut = new PgUser()
    sut.id = 2
    sut.email = 'other@email.com'
    const plain = sut.toPlain()
    expect(plain).toMatchObject({ id: 2, email: 'other@email.com' })
  })

  it('should allow undefined optional properties', () => {
    const sut = new PgUser()
    sut.email = 'any_email@email.com'

    expect(sut.name).toBeUndefined()
    expect(sut.facebookId).toBeUndefined()
    expect(sut.pictureUrl).toBeUndefined()
    expect(sut.initials).toBeUndefined()
  })
})