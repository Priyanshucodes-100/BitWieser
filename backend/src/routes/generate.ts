import type { FastifyInstance } from 'fastify'
import { getCurrentIngestJob } from '../db/queries.js'
import { badRequest } from '../lib/httpError.js'
import { getGeneratePublic, startGenerate } from '../services/generate.js'

export async function generateRoutes(app: FastifyInstance): Promise<void> {
  app.post('/generate', async () => {
    const ingest = await getCurrentIngestJob()
    if (!ingest || ingest.event_count <= 0) {
      throw badRequest(
        'Generate data only works after a dataset is loaded. Choose a file or load the demo dataset first.',
      )
    }
    const job = await startGenerate(ingest.id, ingest.event_count)
    return { data: job }
  })

  app.get<{ Params: { jobId: string } }>('/generate/:jobId', async (request) => {
    const job = await getGeneratePublic(request.params.jobId)
    return { data: job }
  })
}
