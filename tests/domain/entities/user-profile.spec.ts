import { UserProfile } from '@/domain/entities/user-profile'

describe('UserProfile', () => {
  let sut: UserProfile

  beforeEach(() => {
    sut = new UserProfile('any_id')
  })

  it('should create with empty initials when pictureKey is provided', () => {
    sut.setPicture({ pictureKey: 'any_key', name: 'any_name' })

    expect(sut).toEqual({
      id: 'any_id',
      pictureKey: 'any_key',
      initials: undefined
    })
  })

  it('should create with empty initials when pictureKey is provided', () => {
    sut.setPicture({ pictureKey: 'any_key' })

    expect(sut).toEqual({
      id: 'any_id',
      pictureKey: 'any_key',
      initials: undefined
    })
  })

  it('should create initials with first letter of first and last names', () => {
    sut.setPicture({ name: 'lourivaldo coutinho de vasconcelos' })

    expect(sut).toEqual({
      id: 'any_id',
      pictureKey: undefined,
      initials: 'LV'
    })
  })

  it('should create initials with first letter when name has only one word', () => {
    sut.setPicture({ name: 'lourivaldo' })

    expect(sut).toEqual({
      id: 'any_id',
      pictureKey: undefined,
      initials: 'L'
    })
  })

  it('should create initials with first letter when name has only one word (short)', () => {
    sut.setPicture({ name: 'lu' })

    expect(sut).toEqual({
      id: 'any_id',
      pictureKey: undefined,
      initials: 'L'
    })
  })

  it('should create initials with first letter', () => {
    sut.setPicture({ name: 'l' })

    expect(sut).toEqual({
      id: 'any_id',
      pictureKey: undefined,
      initials: 'L'
    })
  })

  it('should create with empty initials when name and pictureKey are not provided', () => {
    sut.setPicture({})

    expect(sut).toEqual({
      id: 'any_id',
      pictureKey: undefined,
      initials: undefined
    })
  })

  it('should create with empty initials when name and pictureKey are not provided', () => {
    sut.setPicture({ name: '' })

    expect(sut).toEqual({
      id: 'any_id',
      pictureKey: undefined,
      initials: undefined
    })
  })
})
