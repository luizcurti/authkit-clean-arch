import { Router, Express } from 'express'
import { readdirSync } from 'fs'
import { join } from 'path'

export const setupRoutes = async (app: Express): Promise<void> => {
  const router = Router()
  const files = readdirSync(join(__dirname, '../routes'))
    .filter(file => (file.endsWith('.js') || file.endsWith('.ts')) && !file.endsWith('.d.ts'))
  await Promise.all(files.map(async file => {
    (await import(`../routes/${file}`)).default(router)
  }))
  app.use('/api', router)
}
