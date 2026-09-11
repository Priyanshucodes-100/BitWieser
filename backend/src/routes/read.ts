import type { FastifyInstance } from 'fastify'
import { readAlert, readAlerts, readEntity, readGraph, readOverview, readSearch } from '../services/read.js'
import type { AlertFilters, AlertType, RiskLevel } from '../types/intel.js'

const riskValues = ['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const
const typeValues = ['ALL', 'layering', 'ip-reuse', 'mixer-proximity', 'anomaly'] as const
const sortByValues = ['rank', 'confidence', 'lastActivity', 'entity'] as const
const sortDirValues = ['asc', 'desc'] as const

interface AlertsQuery {
  risk?: string
  type?: string
  country?: string
  q?: string
  sortBy?: string
  sortDir?: string
}

function parseFilters(query: AlertsQuery): AlertFilters {
  const risk = riskValues.includes(query.risk as (typeof riskValues)[number])
    ? (query.risk as RiskLevel | 'ALL')
    : undefined
  const type = typeValues.includes(query.type as (typeof typeValues)[number])
    ? (query.type as AlertType | 'ALL')
    : undefined
  const sortBy = sortByValues.includes(query.sortBy as (typeof sortByValues)[number])
    ? (query.sortBy as AlertFilters['sortBy'])
    : undefined
  const sortDir = sortDirValues.includes(query.sortDir as (typeof sortDirValues)[number])
    ? (query.sortDir as AlertFilters['sortDir'])
    : undefined
  return {
    risk,
    type,
    country: query.country,
    q: query.q,
    sortBy,
    sortDir,
  }
}

export async function readRoutes(app: FastifyInstance): Promise<void> {
  app.get('/overview', async () => {
    const data = await readOverview()
    return { data }
  })

  app.get<{ Querystring: AlertsQuery }>('/alerts', async (request) => {
    const { data, ingest } = await readAlerts(parseFilters(request.query))
    return { data, meta: { total: data.length, ingest } }
  })

  app.get<{ Params: { id: string } }>('/alerts/:id', async (request) => {
    const data = await readAlert(request.params.id)
    return { data }
  })

  app.get<{ Querystring: { entityId?: string } }>('/graph', async (request) => {
    const entityId = request.query.entityId?.trim() || undefined
    const data = await readGraph(entityId)
    return { data }
  })

  app.get<{ Params: { id: string } }>('/entities/:id', async (request) => {
    const data = await readEntity(request.params.id)
    return { data }
  })

  app.get<{ Querystring: { q?: string } }>('/search', async (request) => {
    const q = request.query.q ?? ''
    return readSearch(q)
  })
}
