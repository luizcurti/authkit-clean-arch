import { FacebookApi } from '@/infra/gateways/facebook-api'
import { AxiosHttpClient } from '@/infra/gateways/axios-client'
import { env } from '@/main/config/env'

// A valid Facebook test-user token is short-lived and must be generated fresh via the
// Graph API Explorer / your Facebook app's test users — it can't be committed to source
// control. Set FB_TEST_USER_TOKEN in `.env` to exercise this test; otherwise it's skipped.
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
