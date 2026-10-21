export interface LoadUserAccount {
  load: (input: LoadUserAccount.Input) => Promise<LoadUserAccount.Output>
}

export namespace LoadUserAccount {
  // By Facebook identity first; the email only finds an account without one
  export type Input = {
    facebookId: string
    email: string
  }

  export type Output = undefined | {
    id: string
    name?: string
    facebookId?: string
  }
}

// Never re-binds an account linked to another Facebook identity, atomically: throws AuthenticationError
export interface SaveFacebookAccount {
  saveWithFacebook: (input: SaveFacebookAccount.Input) => Promise<SaveFacebookAccount.Output>
}

export namespace SaveFacebookAccount {
  export type Input = {
    id?: string
    email: string
    name: string
    facebookId: string
  }

  export type Output = {
    id: string
  }
}
