import express from 'express'
import { setupMiddlewares } from './middlewares'
import { setupRoutes } from './routes'
import { setupSwagger } from './swagger'
import { errorHandler } from '@/main/middlewares/error-handler'

const app = express()
setupMiddlewares(app)
setupSwagger(app)

// Resolves once the route files and the error handler are registered
const ready = setupRoutes(app).then(() => {
  app.use(errorHandler)
})

export { app, ready }
