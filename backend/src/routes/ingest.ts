import type { FastifyInstance } from 'fastify'
import { ingestDemo, ingestFile } from '../services/ingest.js'

export async function ingestRoutes(app: FastifyInstance): Promise<void> {
  app.post('/ingest', async (request) => {
    if (request.isMultipart()) {
      const file = await request.file()
      if (!file) {
        return ingestDemo()
      }
      const bytes = await file.toBuffer()
      const name = file.filename || 'capture.csv'
      return ingestFile(name, bytes)
    }
    return ingestDemo()
  })
}
