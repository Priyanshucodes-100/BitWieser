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
  OverviewStats,
  SearchHit,
} from '@/types/intel'

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001').replace(/\/$/, '')

interface GenerateJobPayload {
  jobId: string
  status: 'queued' | 'running' | 'done' | 'error'
  step: string | null
  error: string | null
  eventCount: number | null
  rows?: EntityTableRow[]
  graph?: GraphPayload
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData
  if (!isForm && init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch {
    throw new Error('Cannot reach ChainWatch API. Start the backend on port 3001.')
  }
  const text = await res.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text) as unknown
    } catch {
      json = null
    }
  }
  if (!res.ok) {
    const message =
      json && typeof json === 'object' && json !== null && 'message' in json
        ? String((json as { message: unknown }).message)
        : `Request failed (${res.status})`
    throw new Error(message)
  }
  return json as T
}

function qs(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue
    sp.set(key, value)
  }
  const encoded = sp.toString()
  return encoded ? `?${encoded}` : ''
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export async function getHealth(): Promise<HealthResponse> {
  return api<HealthResponse>('/health')
}

export async function getOverviewStats(): Promise<ApiItemResponse<OverviewStats>> {
  return api<ApiItemResponse<OverviewStats>>('/overview')
}

export async function getAlerts(filters: AlertFilters = {}): Promise<ApiListResponse<Alert[]>> {
  return api<ApiListResponse<Alert[]>>(
    `/alerts${qs({
      risk: filters.risk,
      type: filters.type,
      country: filters.country,
      q: filters.q,
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
    })}`,
  )
}

export async function getAlert(id: string): Promise<ApiItemResponse<Alert>> {
  return api<ApiItemResponse<Alert>>(`/alerts/${encodeURIComponent(id)}`)
}

export async function getGraph(entityId?: string): Promise<ApiItemResponse<GraphPayload>> {
  const path = entityId ? `/graph${qs({ entityId })}` : '/graph'
  return api<ApiItemResponse<GraphPayload>>(path)
}

export async function getEntity(id: string): Promise<ApiItemResponse<EntityDetail>> {
  return api<ApiItemResponse<EntityDetail>>(`/entities/${encodeURIComponent(id)}`)
}

export async function ingestMock(_file?: File): Promise<IngestResponse> {
  if (_file) return loadCaptureFile(_file)
  return api<IngestResponse>('/ingest', { method: 'POST', body: JSON.stringify({ demo: true }) })
}

export async function loadCaptureFile(file: File): Promise<IngestResponse> {
  const body = new FormData()
  body.append('file', file)
  return api<IngestResponse>('/ingest', { method: 'POST', body })
}

export async function generateFromLoaded(
  onProgress?: (step: string) => void,
): Promise<{ rows: EntityTableRow[]; eventCount: number; graph: GraphPayload }> {
  const started = await api<ApiItemResponse<GenerateJobPayload>>('/generate', { method: 'POST' })
  const jobId = started.data.jobId
  if (started.data.step) onProgress?.(started.data.step)

  for (;;) {
    const { data } = await api<ApiItemResponse<GenerateJobPayload>>(`/generate/${encodeURIComponent(jobId)}`)
    if (data.step) onProgress?.(data.step)
    if (data.status === 'done') {
      return {
        rows: data.rows ?? [],
        eventCount: data.eventCount ?? 0,
        graph: data.graph ?? { nodes: [], edges: [], focusNodeIds: [], highlightPath: [] },
      }
    }
    if (data.status === 'error') {
      throw new Error(data.error ?? 'Generation failed. The backend could not validate, enrich, or score this dataset.')
    }
    await sleep(250)
  }
}

export async function searchConsole(q: string): Promise<SearchHit[]> {
  const hits = await api<SearchHit[]>(`/search${qs({ q })}`)
  return Array.isArray(hits) ? hits : []
}
