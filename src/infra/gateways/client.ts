
export interface HttpGetClient {
  get: <T = unknown> (input: HttpGetClient.Input) => Promise<T>
}

export namespace HttpGetClient {
  export type Input = {
    url: string
    params: object
  }
}
