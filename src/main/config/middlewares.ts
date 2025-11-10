import { json, Express } from 'express'
import cors from 'cors'
import { httpLogger } from '@/main/middlewares/http-logger'

export const setupMiddlewares = (app: Express): void => {
  // CORS
  app.use(cors())
  
  // Logging de requisições HTTP
  app.use(httpLogger)
  
  // Body parser
  app.use(json())
  
  // Content type
  app.use((req, res, next) => {
    res.type('json')
    next()
  })
}
