import { RequestHandler } from 'express'
import multer, { MulterError } from 'multer'
import { ServerError } from '@/application/errors'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB – same limit enforced by MaxFileSize validator

export const adaptMulter: RequestHandler = (req, res, next) => {
  const upload = multer({ limits: { fileSize: MAX_FILE_SIZE_BYTES } }).single('picture')
  return upload(req, res, (error) => {
    if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' })
    }
    if (error !== undefined) {
      return res.status(500).json({ error: new ServerError(error).message })
    }
    if (req.file !== undefined) {
      req.locals = {
        ...req.locals,
        file: { buffer: req.file.buffer, mimeType: req.file.mimetype }
      }
      return next()
    }
    return res.status(400).json({ error: 'The field file is required' })
  })
}
