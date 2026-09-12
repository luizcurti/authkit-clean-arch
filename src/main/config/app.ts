import express from 'express'
import { setupMiddlewares } from './middlewares'
import { setupRoutes } from './routes'
import { setupSwagger } from './swagger'

const app = express()
setupMiddlewares(app)
setupSwagger(app)

// Routes are async; export a promise-based initializer for tests and for main entry
const ready = setupRoutes(app)

export { app, ready }
