import { mock, MockProxy } from 'jest-mock-extended'
import { FacebookApi, HttpGetClient } from '@/infra/gateways'
import { ExternalServiceError } from '@/domain/entities/errors'

describe('FacebookApi', () => {
  let clientId: string
  let clientSecret: string
  let httpClient: MockProxy<HttpGetClient>
  let suit: FacebookApi

  beforeAll(() => {
    clientId = 'any_client_id'
    clientSecret = 'any_client_secret'
    httpClient = mock()
  })

  beforeEach(() => {
    httpClient.get
      .mockResolvedValueOnce({ access_token: 'any_app_token' })
      .mockResolvedValueOnce({ data: { app_id: clientId, is_valid: true, user_id: 'any_user_id' } })
      .mockResolvedValueOnce({ id: 'any_fb_id', name: 'any_fb_name', email: 'any_fb_email' })
    suit = new FacebookApi(httpClient, clientId, clientSecret)
  })

  it('Should get app token', async () => {
    await suit.loadUser({ token: 'any_client_token' })

    expect(httpClient.get).toHaveBeenCalledWith({
      url: 'https://graph.facebook.com/oauth/access_token',
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
      }
    })
  })

  it('Should get debug token', async () => {
    await suit.loadUser({ token: 'any_client_token' })

    expect(httpClient.get).toHaveBeenCalledWith({
      url: 'https://graph.facebook.com/debug_token',
      params: {
        access_token: 'any_app_token',
        input_token: 'any_client_token'
      }
    })
  })

  it('Should get user info', async () => {
    await suit.loadUser({ token: 'any_client_token' })

    expect(httpClient.get).toHaveBeenCalledWith({
      url: 'https://graph.facebook.com/any_user_id',
      params: {
        fields: 'id,name,email',
        access_token: 'any_client_token'
      }
    })
  })

  it('Should return facebook user', async () => {
    const fbUser = await suit.loadUser({ token: 'any_client_token' })

    expect(fbUser).toEqual({
      facebookId: 'any_fb_id',
      name: 'any_fb_name',
      email: 'any_fb_email'
    })
  })

  it('Should return undefined and skip user info if token was issued for another app', async () => {
    httpClient.get.mockReset()
      .mockResolvedValueOnce({ access_token: 'any_app_token' })
      .mockResolvedValueOnce({ data: { app_id: 'other_app_id', is_valid: true, user_id: 'any_user_id' } })

    const fbUser = await suit.loadUser({ token: 'any_client_token' })

    expect(fbUser).toBeUndefined()
    expect(httpClient.get).toHaveBeenCalledTimes(2)
  })

  it('Should return undefined and skip user info if token is not valid', async () => {
    httpClient.get.mockReset()
      .mockResolvedValueOnce({ access_token: 'any_app_token' })
      .mockResolvedValueOnce({ data: { app_id: clientId, is_valid: false, user_id: 'any_user_id' } })

    const fbUser = await suit.loadUser({ token: 'any_client_token' })

    expect(fbUser).toBeUndefined()
    expect(httpClient.get).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['omitted (permission declined or phone-only account)', undefined],
    ['empty', '']
  ])('Should return undefined when the Facebook email is %s', async (_, email) => {
    httpClient.get.mockReset()
      .mockResolvedValueOnce({ access_token: 'any_app_token' })
      .mockResolvedValueOnce({ data: { app_id: clientId, is_valid: true, user_id: 'any_user_id' } })
      .mockResolvedValueOnce({ id: 'any_fb_id', name: 'any_fb_name', email })

    const fbUser = await suit.loadUser({ token: 'any_client_token' })

    expect(fbUser).toBeUndefined()
  })

  it('Should normalize the Facebook email to trimmed lowercase', async () => {
    httpClient.get.mockReset()
      .mockResolvedValueOnce({ access_token: 'any_app_token' })
      .mockResolvedValueOnce({ data: { app_id: clientId, is_valid: true, user_id: 'any_user_id' } })
      .mockResolvedValueOnce({ id: 'any_fb_id', name: 'any_fb_name', email: '  Any.Person@Mail.COM ' })

    const fbUser = await suit.loadUser({ token: 'any_client_token' })

    expect(fbUser).toEqual({ facebookId: 'any_fb_id', name: 'any_fb_name', email: 'any.person@mail.com' })
  })

  it('Should return undefined when the Facebook email is only whitespace', async () => {
    httpClient.get.mockReset()
      .mockResolvedValueOnce({ access_token: 'any_app_token' })
      .mockResolvedValueOnce({ data: { app_id: clientId, is_valid: true, user_id: 'any_user_id' } })
      .mockResolvedValueOnce({ id: 'any_fb_id', name: 'any_fb_name', email: '   ' })

    const fbUser = await suit.loadUser({ token: 'any_client_token' })

    expect(fbUser).toBeUndefined()
  })

  it('Should return undefined if HttpGetClient throws', async () => {
    httpClient.get.mockReset().mockRejectedValueOnce(new Error('fb_error'))

    const fbUser = await suit.loadUser({ token: 'any_client_token' })

    expect(fbUser).toBeUndefined()
  })

  it('Should rethrow ExternalServiceError if HttpGetClient throws it', async () => {
    httpClient.get.mockReset().mockRejectedValueOnce(new ExternalServiceError())

    const promise = suit.loadUser({ token: 'any_client_token' })

    await expect(promise).rejects.toBeInstanceOf(ExternalServiceError)
  })
})
