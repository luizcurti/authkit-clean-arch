export namespace UploadFile {
  export type Input = { file: Buffer, fileName: string, contentType: string }
}

export interface UploadFile {
  upload: (input: UploadFile.Input) => Promise<void>
}

export namespace DeleteFile {
  export type Input = { fileName: string }
}

export interface DeleteFile {
  delete: (input: DeleteFile.Input) => Promise<void>
}

export namespace GetFileUrl {
  export type Input = { fileName: string }
  export type Output = string
}

// Only the file name is persisted; the URL (CDN or pre-signed) is resolved when handed out
export interface GetFileUrl {
  getUrl: (input: GetFileUrl.Input) => Promise<GetFileUrl.Output>
}
