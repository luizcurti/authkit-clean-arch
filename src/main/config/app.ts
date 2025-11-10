import express from 'express'
import { setupMiddlewares } from './middlewares'
import { setupRoutes } from './routes'
import { setupSwagger } from './swagger'

const app = express()
setupMiddlewares(app)
setupRoutes(app)
setupSwagger(app)
export { app }
