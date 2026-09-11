import type { FastifyInstance } from 'fastify'
import { pingDb } from '../db/pool.js'
import type { HealthResponse } from '../types/intel.js'

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_req, reply) => {
    const db = await pingDb()
    if (!db) {
      return reply.status(503).send({ message: 'PostgreSQL is unreachable. Start Postgres and check DATABASE_URL.' })
    }
    const body: HealthResponse = {
      status: 'ok',
      offline: true,
      service: 'chainwatch-api',
    }
    return body
  })
}
