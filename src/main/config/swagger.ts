import { Express } from 'express'
import swaggerUi from 'swagger-ui-express'
import swaggerDocument from '@/main/docs/swagger.json'

import { env } from '@/main/config/env'

// The validator badge (an external image) is off, so the UI runs under the default CSP
export const setupSwagger = (app: Express): void => {
  if (!env.apiDocsEnabled) return
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: { validatorUrl: null }
  }))
}
