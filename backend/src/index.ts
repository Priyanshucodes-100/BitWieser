import { existsSync } from 'node:fs'
import type { FastifyError } from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import Fastify from 'fastify'
import {
  CORS_ORIGINS,
  CORS_REFLECT,
  FRONTEND_DIST,
  LISTEN_HOST,
  PORT,
  ensureUploadDir,
} from './config.js'
import { migrate } from './db/migrate.js'
import { HttpError } from './lib/httpError.js'
import { generateRoutes } from './routes/generate.js'
import { healthRoutes } from './routes/health.js'
import { ingestRoutes } from './routes/ingest.js'
import { readRoutes } from './routes/read.js'

const app = Fastify({
  logger: true,
  bodyLimit: 25 * 1024 * 1024,
})

app.setErrorHandler((error: FastifyError, _request, reply) => {
  if (error instanceof HttpError) {
    return reply.status(error.statusCode).send({ message: error.message })
  }
  const status = typeof error.statusCode === 'number' && error.statusCode >= 400 ? error.statusCode : 500
  const message = status >= 500 ? 'Internal server error.' : error.message || 'Request failed.'
  if (status >= 500) app.log.error(error)
  return reply.status(status).send({ message })
})

await app.register(cors, {
  origin: CORS_REFLECT ? true : CORS_ORIGINS,
  credentials: true,
})

await app.register(multipart, {
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
})

await app.register(healthRoutes)
await app.register(ingestRoutes)
await app.register(generateRoutes)
await app.register(readRoutes)

const serveUi = Boolean(FRONTEND_DIST && existsSync(FRONTEND_DIST))
if (serveUi) {
  const apiPrefix =
    /^\/(health|ingest|generate|overview|alerts|graph|entities|search)(\/|\?|$)/
  await app.register(fastifyStatic, {
    root: FRONTEND_DIST,
    prefix: '/',
  })
  app.setNotFoundHandler((request, reply) => {
    const pathOnly = request.url.split('?')[0] ?? '/'
    if (request.method === 'GET' && !apiPrefix.test(pathOnly)) {
      return reply.sendFile('index.html')
    }
    return reply.status(404).send({ message: 'Not found' })
  })
}

await ensureUploadDir()
await migrate()

await app.listen({ port: PORT, host: LISTEN_HOST })
app.log.info(`chainwatch-api listening on ${LISTEN_HOST}:${PORT}${serveUi ? ' (ui+api)' : ''}`)
