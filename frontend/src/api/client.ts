import {
  alerts,
  events as demoEvents,
  getEntityDetail,
  getOverview,
  graphEdges,
  graphNodes,
  highlightPath,
  ingestStatus,
  neighborhoodIds,
  searchIndex,
} from '@/mocks/demoDataset'
import { GENERATE_STEPS, OVERVIEW_GRAPH_ID, runGeneratePipeline } from '@/api/pipeline'
import { parseCapture } from '@/lib/parseCapture'
import { delay, mockLatency } from '@/lib/utils'
import {
  getGeneratedDetail,
  getGeneratedGraph,
  getLoadedEvents,
  setGeneratedSession,
  setLoadedEvents,
} from '@/mocks/sessionStore'
import type {
  Alert,
  AlertFilters,
  ApiItemResponse,
  ApiListResponse,
  EntityDetail,
  EntityTableRow,
  GraphPayload,
  HealthResponse,
  IngestResponse,
  IngestStatus,
  OverviewStats,
  SearchHit,
} from '@/types/intel'

function clone<T>(value: T): T {
  return structuredClone(value)
}

export async function getHealth(): Promise<HealthResponse> {
  await mockLatency()
  return { status: 'ok', offline: true, service: 'chainwatch-mock' }
}

export async function getOverviewStats(): Promise<ApiItemResponse<OverviewStats>> {
  await mockLatency()
  return { data: clone(getOverview()) }
}

export async function getAlerts(
  filters: AlertFilters = {},
): Promise<ApiListResponse<Alert[]>> {
  await mockLatency()
  let rows = clone(alerts)

  if (filters.risk && filters.risk !== 'ALL') {
    rows = rows.filter((a) => a.risk === filters.risk)
  }
  if (filters.type && filters.type !== 'ALL') {
    rows = rows.filter((a) => a.type === filters.type)
  }
  if (filters.country && filters.country !== 'ALL') {
    rows = rows.filter((a) => a.countryHops.includes(filters.country as string))
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim().toLowerCase()
    rows = rows.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.entityId.toLowerCase().includes(q) ||
        a.type.includes(q) ||
        a.wallets.some((w) => w.label.toLowerCase().includes(q) || w.address.toLowerCase().includes(q)) ||
        a.ips.some((ip) => ip.ip.includes(q) || ip.countryCode.toLowerCase() === q),
    )
  }

  const sortBy = filters.sortBy ?? 'rank'
  rows.sort((a, b) => {
    const dir = filters.sortDir === 'desc' ? -1 : 1
    if (sortBy === 'rank') return (a.rank - b.rank) * dir
    if (sortBy === 'confidence') return (a.confidence - b.confidence) * dir
    if (sortBy === 'lastActivity') return a.lastActivity.localeCompare(b.lastActivity) * dir
    return a.title.localeCompare(b.title) * dir
  })

  return {
    data: rows,
    meta: { total: rows.length, ingest: clone(ingestStatus) },
  }
}

export async function getAlert(id: string): Promise<ApiItemResponse<Alert>> {
  await mockLatency()
  const found = alerts.find((a) => a.id === id)
  if (!found) {
    throw new Error(`Alert ${id} not found`)
  }
  return { data: clone(found) }
}

export async function getGraph(entityId?: string): Promise<ApiItemResponse<GraphPayload>> {
  await mockLatency()
  if (entityId) {
    const generated = getGeneratedGraph(entityId)
    if (generated) return { data: clone(generated) }
  } else {
    const overview = getGeneratedGraph(OVERVIEW_GRAPH_ID)
    if (overview) return { data: clone(overview) }
  }
  const focusNodeIds = entityId ? neighborhoodIds(entityId) : [...highlightPath]
  return {
    data: {
      nodes: clone(graphNodes),
      edges: clone(graphEdges),
      focusNodeIds,
      highlightPath: [...highlightPath],
    },
  }
}

export async function getEntity(id: string): Promise<ApiItemResponse<EntityDetail>> {
  await mockLatency()
  const generated = getGeneratedDetail(id)
  if (generated) return { data: clone(generated) }
  const detail = getEntityDetail(id)
  if (!detail) {
    throw new Error(`Entity ${id} not found`)
  }
  return { data: clone(detail) }
}

export async function ingestMock(_file?: File): Promise<IngestResponse> {
  await delay(800)
  const source = _file ? undefined : demoEvents
  if (source) setLoadedEvents(clone(source))
  const next: IngestStatus = {
    ...ingestStatus,
    loaded: true,
    lastIngestAt: new Date().toISOString(),
    datasetName: _file?.name ?? ingestStatus.datasetName,
    eventCount: source?.length ?? ingestStatus.eventCount,
  }
  return {
    data: clone(next),
    message: `Loaded ${next.eventCount} events. Ready to generate.`,
  }
}

export async function loadCaptureFile(file: File): Promise<IngestResponse> {
  const text = await file.text()
  await delay(400)
  const parsed = parseCapture(text, file.name)
  if (parsed.error && parsed.events.length === 0) {
    throw new Error(parsed.error)
  }
  if (parsed.events.length === 0) {
    throw new Error(
      `Could not load ${file.name}: no valid records. Need src_ip or txid on each row, plus headers such as timestamp, input_addresses[], output_addresses[].`,
    )
  }
  setLoadedEvents(clone(parsed.events))
  const next: IngestStatus = {
    ...ingestStatus,
    loaded: true,
    datasetName: file.name,
    eventCount: parsed.events.length,
    parseErrors: parsed.parseErrors,
    geoipEnriched: parsed.events.filter((e) => Boolean(e.geoCountry)).length,
    lastIngestAt: new Date().toISOString(),
    offline: true,
  }
  return {
    data: clone(next),
    message: `Loaded ${parsed.events.length} records from ${file.name}${parsed.parseErrors ? ` · ${parsed.parseErrors} rows skipped` : ''}.`,
  }
}

export async function generateFromLoaded(
  onProgress?: (step: string) => void,
): Promise<{ rows: EntityTableRow[]; eventCount: number; graph: GraphPayload }> {
  let loaded = getLoadedEvents()
  if (loaded.length === 0) {
    setLoadedEvents(clone(demoEvents))
    loaded = getLoadedEvents()
  }
  if (loaded.length === 0) {
    throw new Error('Generate data only works after a dataset is loaded. Choose a file or load the demo dataset first.')
  }
  for (const step of GENERATE_STEPS) {
    onProgress?.(step)
    await delay(450)
  }
  const bundle = runGeneratePipeline(loaded)
  setGeneratedSession(bundle)
  return {
    rows: clone(bundle.rows),
    eventCount: loaded.length,
    graph: clone(bundle.graphs[OVERVIEW_GRAPH_ID] ?? { nodes: [], edges: [], focusNodeIds: [], highlightPath: [] }),
  }
}

export async function searchConsole(q: string): Promise<SearchHit[]> {
  await delayShort()
  return searchIndex(q)
}

function delayShort(): Promise<void> {
  return new Promise((r) => window.setTimeout(r, 80))
}
