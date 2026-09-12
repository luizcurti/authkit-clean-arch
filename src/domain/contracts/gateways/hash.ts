export namespace Hasher {
  export type Input = string
  export type Output = string
}
export interface Hasher {
  hash: (input: Hasher.Input) => Promise<Hasher.Output>
}
