import { FacebookApi } from '@/infra/gateways/facebook-api'
import { AxiosHttpClient } from '@/infra/gateways/axios-client'
import { env } from '@/main/config/env'

// Needs a short-lived test-user token in FB_TEST_USER_TOKEN; skipped without it
const testUserToken = process.env.FB_TEST_USER_TOKEN

describe('Facebook Api Integration Tests', () => {
  let axiosClient: AxiosHttpClient
  let sut: FacebookApi

  beforeEach(() => {
    axiosClient = new AxiosHttpClient()
    sut = new FacebookApi(
      axiosClient,
      env.facebookApi.clientId,
      env.facebookApi.clientSecret
    )
  })

  const itIfTokenProvided = testUserToken !== undefined ? it : it.skip

  itIfTokenProvided('should return a Facebook User if token is valid', async () => {
    const fbUser = await sut.loadUser({ token: testUserToken as string })

    expect(fbUser).toMatchObject({
      facebookId: expect.any(String),
      email: expect.any(String)
    })
  })

  it('should return undefined if token is invalid', async () => {
    const axiosClient = new AxiosHttpClient()
    const sut = new FacebookApi(
      axiosClient,
      env.facebookApi.clientId,
      env.facebookApi.clientSecret
    )

    const fbUser = await sut.loadUser({ token: 'invalid' })

    expect(fbUser).toBeUndefined()
  })
})
