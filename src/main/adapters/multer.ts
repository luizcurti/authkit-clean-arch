import { RequestHandler } from 'express'
import multer, { MulterError } from 'multer'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // Same limit as the MaxFileSize validator

export const adaptMulter: RequestHandler = (req, res, next) => {
  const upload = multer({ limits: { fileSize: MAX_FILE_SIZE_BYTES } }).single('picture')
  return upload(req, res, (error) => {
    // With memory storage every error is about the request: a limit or a malformed body
    if (error !== undefined) {
      const message = error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE'
        ? 'File too large. Maximum size is 5MB.'
        : `Invalid upload: ${(error as Error).message}`
      return res.status(400).json({ error: message, requestId: req.locals?.requestId })
    }
    if (req.file !== undefined) {
      req.locals = {
        ...req.locals,
        file: { buffer: req.file.buffer, mimeType: req.file.mimetype }
      }
      return next()
    }
    return res.status(400).json({ error: 'The field file is required', requestId: req.locals?.requestId })
  })
}
