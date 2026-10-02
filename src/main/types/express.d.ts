declare module Express {
  interface Request {
    // Values passed from middlewares to the route adapter
    locals?: {
      requestId?: string
      userId?: string
      file?: { buffer: Buffer, mimeType: string }
    }
  }
}
