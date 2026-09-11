import { DEMO_SCOPE } from '../config.js'
import {
  getAlertRow,
  getCurrentGenerateId,
  getCurrentIngestJob,
  getEntityDetailRow,
  getGraphRow,
  ingestStatusFromJob,
  listAlerts,
  listEntityRows,
  listEvents,
} from '../db/queries.js'
import { notFound } from '../lib/httpError.js'
import {
  getEntityDetail as demoEntityDetail,
  getOverview,
  graphEdges,
  graphNodes,
  highlightPath,
  neighborhoodIds,
  searchIndex as demoSearch,
} from '../seed/demoDataset.js'
import { OVERVIEW_GRAPH_ID, buildEntityNeighborhoodGraph } from './pipeline.js'
import { filterAndSortAlerts } from './alerts.js'
import type {
  Alert,
  AlertFilters,
  EntityDetail,
  GraphPayload,
  IngestStatus,
  OverviewStats,
  SearchHit,
} from '../types/intel.js'

async function currentIngest(): Promise<IngestStatus> {
  const job = await getCurrentIngestJob()
  if (!job) return getOverview().ingest
  return ingestStatusFromJob(job)
}

async function alertScope(): Promise<string> {
  return (await getCurrentGenerateId()) ?? DEMO_SCOPE
}

export async function readOverview(): Promise<OverviewStats> {
  const ingest = await currentIngest()
  const generateId = await getCurrentGenerateId()
  if (!generateId) {
    return { ...getOverview(), ingest }
  }

  const rows = await listEntityRows(generateId)
  const alerts = await listAlerts(generateId)
  const job = await getCurrentIngestJob()
  const events = job ? await listEvents(job.id) : []
  const uniqueWallets = new Set(events.flatMap((e) => [...e.inputAddresses, ...e.outputAddresses]))
  const uniqueIps = new Set(events.flatMap((e) => [e.srcIp, e.dstIp]))
  const high = rows.filter((r) => r.risk === 'HIGH')
  const hottest = high[0]?.id ?? rows[0]?.id ?? 'entity-17'
  return {
    totalEvents: events.length,
    uniqueWallets: uniqueWallets.size,
    uniqueIps: uniqueIps.size,
    flaggedEntities: rows.filter((r) => r.risk !== 'LOW').length,
    highRiskCount: high.length,
    lastUpdated: ingest.lastIngestAt ?? new Date().toISOString(),
    ingest,
    topAlerts: alerts.slice(0, 5),
    hottestClusterId: hottest,
  }
}

export async function readAlerts(filters: AlertFilters): Promise<{ data: Alert[]; ingest: IngestStatus }> {
  const ingest = await currentIngest()
  const scope = await alertScope()
  const rows = await listAlerts(scope)
  return { data: filterAndSortAlerts(rows, filters), ingest }
}

export async function readAlert(id: string): Promise<Alert> {
  const generateId = await getCurrentGenerateId()
  if (generateId) {
    const generated = await getAlertRow(generateId, id)
    if (generated) return generated
  }
  const demo = await getAlertRow(DEMO_SCOPE, id)
  if (!demo) throw notFound(`Alert ${id} not found`)
  return demo
}

export async function readGraph(entityId?: string): Promise<GraphPayload> {
  const generateId = await getCurrentGenerateId()

  if (entityId) {
    if (generateId) {
      const detail = await getEntityDetailRow(generateId, entityId)
      if (detail) return buildEntityNeighborhoodGraph(detail)
    }
    const demo = demoEntityDetail(entityId)
    if (demo || neighborhoodIds(entityId).length > 0) {
      const focusNodeIds = neighborhoodIds(entityId)
      return {
        nodes: graphNodes,
        edges: graphEdges,
        focusNodeIds: focusNodeIds.length ? focusNodeIds : [...highlightPath],
        highlightPath: [...highlightPath],
      }
    }
    throw notFound(`Graph for ${entityId} not found`)
  }

  if (generateId) {
    const overview = await getGraphRow(generateId, OVERVIEW_GRAPH_ID)
    if (overview?.nodes.length) return overview
  }

  return {
    nodes: graphNodes,
    edges: graphEdges,
    focusNodeIds: [...highlightPath],
    highlightPath: [...highlightPath],
  }
}

export async function readEntity(id: string): Promise<EntityDetail> {
  const generateId = await getCurrentGenerateId()
  if (generateId) {
    const generated = await getEntityDetailRow(generateId, id)
    if (generated) return generated
  }
  const seeded = await getEntityDetailRow(DEMO_SCOPE, id)
  if (seeded) return seeded
  const demo = demoEntityDetail(id)
  if (!demo) throw notFound(`Entity ${id} not found`)
  return demo
}

export async function readSearch(q: string): Promise<SearchHit[]> {
  const needle = q.trim()
  if (needle.length < 2) return []
  const generateId = await getCurrentGenerateId()
  if (!generateId) return demoSearch(needle)

  const hits: SearchHit[] = []
  const lower = needle.toLowerCase()
  const alerts = await listAlerts(generateId)
  for (const a of alerts) {
    if (
      a.id.toLowerCase().includes(lower) ||
      a.title.toLowerCase().includes(lower) ||
      a.entityId.toLowerCase().includes(lower)
    ) {
      hits.push({
        kind: 'alert',
        id: a.id,
        label: a.title,
        href: `/alerts/${a.id}`,
        meta: `${a.risk} · ${Math.round(a.confidence * 100)}%`,
      })
    }
    for (const w of a.wallets) {
      if (w.label.toLowerCase().includes(lower) || w.address.toLowerCase().includes(lower)) {
        hits.push({
          kind: 'wallet',
          id: w.id,
          label: `${w.label} · ${w.address}`,
          href: `/entities/${a.entityId}`,
          meta: a.entityId,
        })
      }
    }
    for (const ip of a.ips) {
      if (ip.ip.includes(lower) || ip.asn.toLowerCase().includes(lower) || ip.countryCode.toLowerCase() === lower) {
        hits.push({
          kind: 'ip',
          id: ip.id,
          label: ip.ip,
          href: `/graph?entityId=${encodeURIComponent(a.entityId)}`,
          meta: `${ip.countryCode} · ${ip.asnOrg}`,
        })
      }
    }
  }
  const demoHits = demoSearch(needle)
  for (const hit of demoHits) {
    if (!hits.some((h) => h.kind === hit.kind && h.id === hit.id)) hits.push(hit)
  }
  return hits.slice(0, 8)
}
