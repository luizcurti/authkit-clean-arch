// Saves only if the stored key is still `replacedPictureKey` (undefined = no picture); false otherwise.
// A saved replacement records a ProfilePictureReplaced outbox event in the same transaction
export interface SaveUserPicture {
  savePicture: (input: SaveUserPicture.Input) => Promise<SaveUserPicture.Output>
}

export namespace SaveUserPicture {
  export type Input = { id: string, pictureKey?: string, initials?: string, replacedPictureKey?: string }
  export type Output = boolean
}

export interface LoadUserProfile {
  load: (input: LoadUserProfile.Input) => Promise<LoadUserProfile.Output>
}

export namespace LoadUserProfile {
  export type Input = {
    id: string
  }
  export type Output = {
    name?: string
    pictureKey?: string
  } | undefined
}
