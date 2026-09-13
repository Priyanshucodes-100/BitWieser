import { randomUUID } from 'node:crypto'
import type {
  Alert,
  EntityDetail,
  EntityTableRow,
  Event,
  GraphPayload,
  IngestStatus,
} from '../types/intel.js'
import { jsonb } from '../lib/winText.js'
import { pool } from './pool.js'

export type IngestKind = 'demo' | 'file'
export type GenerateStatus = 'queued' | 'running' | 'done' | 'error'

export interface IngestJobRow {
  id: string
  kind: IngestKind
  dataset_name: string
  case_name: string
  event_count: number
  parse_errors: number
  geoip_enriched: number
  last_ingest_at: Date | string | null
  file_path: string | null
}

export interface GenerateJobRow {
  id: string
  ingest_id: string
  status: GenerateStatus
  step: string | null
  error: string | null
  event_count: number | null
}

export function ingestStatusFromJob(job: IngestJobRow): IngestStatus {
  const last =
    job.last_ingest_at == null
      ? null
      : typeof job.last_ingest_at === 'string'
        ? job.last_ingest_at
        : job.last_ingest_at.toISOString()
  return {
    loaded: job.event_count > 0,
    datasetName: job.dataset_name,
    caseName: job.case_name,
    eventCount: job.event_count,
    parseErrors: job.parse_errors,
    geoipEnriched: job.geoip_enriched,
    lastIngestAt: last,
    offline: true,
  }
}

export async function getState(key: string): Promise<string | null> {
  const { rows } = await pool.query<{ value: string }>('SELECT value FROM app_state WHERE key = $1', [key])
  return rows[0]?.value ?? null
}

export async function setState(key: string, value: string): Promise<void> {
  await pool.query(
    `INSERT INTO app_state (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value],
  )
}

export async function getCurrentIngestId(): Promise<string | null> {
  const id = await getState('current_ingest_id')
  return id && id.length > 0 ? id : null
}

export async function getCurrentGenerateId(): Promise<string | null> {
  const id = await getState('current_generate_id')
  return id && id.length > 0 ? id : null
}

export async function getIngestJob(id: string): Promise<IngestJobRow | null> {
  const { rows } = await pool.query<IngestJobRow>('SELECT * FROM ingest_jobs WHERE id = $1', [id])
  return rows[0] ?? null
}

export async function getCurrentIngestJob(): Promise<IngestJobRow | null> {
  const id = await getCurrentIngestId()
  if (!id) return null
  return getIngestJob(id)
}

export async function listEvents(ingestId: string): Promise<Event[]> {
  const { rows } = await pool.query<{ payload: Event }>(
    'SELECT payload FROM events WHERE ingest_id = $1 ORDER BY seq ASC',
    [ingestId],
  )
  return rows.map((r) => r.payload)
}

export async function replaceIngest(input: {
  id?: string
  kind: IngestKind
  datasetName: string
  caseName: string
  events: Event[]
  parseErrors: number
  filePath?: string | null
}): Promise<IngestJobRow> {
  const id = input.id ?? `ingest-${randomUUID()}`
  const geoipEnriched = input.events.filter((e) => Boolean(e.geoCountry)).length
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `DELETE FROM entity_details WHERE scope IN (SELECT id FROM generate_jobs WHERE ingest_id = $1)`,
      [id],
    )
    await client.query(`DELETE FROM graphs WHERE scope IN (SELECT id FROM generate_jobs WHERE ingest_id = $1)`, [id])
    await client.query(`DELETE FROM alerts WHERE scope IN (SELECT id FROM generate_jobs WHERE ingest_id = $1)`, [id])
    await client.query('DELETE FROM ingest_jobs WHERE id = $1', [id])
    await client.query(
      `INSERT INTO ingest_jobs (
        id, kind, dataset_name, case_name, event_count, parse_errors, geoip_enriched, last_ingest_at, file_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)`,
      [
        id,
        input.kind,
        input.datasetName,
        input.caseName,
        input.events.length,
        input.parseErrors,
        geoipEnriched,
        input.filePath ?? null,
      ],
    )
    for (let i = 0; i < input.events.length; i++) {
      await client.query('INSERT INTO events (ingest_id, seq, payload) VALUES ($1, $2, $3::jsonb)', [
        id,
        i,
        jsonb(input.events[i]),
      ])
    }
    await client.query(
      `INSERT INTO app_state (key, value) VALUES ('current_ingest_id', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [id],
    )
    await client.query(
      `INSERT INTO app_state (key, value) VALUES ('current_generate_id', '')
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
  const job = await getIngestJob(id)
  if (!job) throw new Error('Failed to persist ingest job')
  return job
}

export async function createGenerateJob(ingestId: string): Promise<GenerateJobRow> {
  const id = `gen-${randomUUID()}`
  const { rows } = await pool.query<GenerateJobRow>(
    `INSERT INTO generate_jobs (id, ingest_id, status, step, event_count)
     VALUES ($1, $2, 'queued', $3, NULL)
     RETURNING id, ingest_id, status, step, error, event_count`,
    [id, ingestId, 'Validating records'],
  )
  const row = rows[0]
  if (!row) throw new Error('Failed to create generate job')
  return row
}

export async function updateGenerateJob(
  id: string,
  patch: Partial<Pick<GenerateJobRow, 'status' | 'step' | 'error' | 'event_count'>>,
): Promise<void> {
  await pool.query(
    `UPDATE generate_jobs
     SET status = COALESCE($2, status),
         step = COALESCE($3, step),
         error = $4,
         event_count = COALESCE($5, event_count),
         updated_at = NOW()
     WHERE id = $1`,
    [id, patch.status ?? null, patch.step ?? null, patch.error ?? null, patch.event_count ?? null],
  )
}

export async function getGenerateJob(id: string): Promise<GenerateJobRow | null> {
  const { rows } = await pool.query<GenerateJobRow>(
    'SELECT id, ingest_id, status, step, error, event_count FROM generate_jobs WHERE id = $1',
    [id],
  )
  return rows[0] ?? null
}

export async function failStaleGenerateJobs(): Promise<void> {
  await pool.query(
    `UPDATE generate_jobs
     SET status = 'error', error = 'Interrupted when the API restarted.', updated_at = NOW()
     WHERE status IN ('queued', 'running')`,
  )
}

export async function persistGenerateResult(input: {
  generateId: string
  ingestId: string
  eventCount: number
  rows: EntityTableRow[]
  details: Record<string, EntityDetail>
  graphs: Record<string, GraphPayload>
  alerts: Alert[]
}): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM entity_rows WHERE generate_id = $1', [input.generateId])
    await client.query('DELETE FROM entity_details WHERE scope = $1', [input.generateId])
    await client.query('DELETE FROM graphs WHERE scope = $1', [input.generateId])
    await client.query('DELETE FROM alerts WHERE scope = $1', [input.generateId])

    for (const row of input.rows) {
      await client.query(
        'INSERT INTO entity_rows (generate_id, entity_id, rank, payload) VALUES ($1, $2, $3, $4::jsonb)',
        [input.generateId, row.id, row.rank, jsonb(row)],
      )
    }
    for (const [entityId, detail] of Object.entries(input.details)) {
      await client.query(
        'INSERT INTO entity_details (scope, entity_id, payload) VALUES ($1, $2, $3::jsonb)',
        [input.generateId, entityId, jsonb(detail)],
      )
    }
    for (const [entityId, graph] of Object.entries(input.graphs)) {
      await client.query('INSERT INTO graphs (scope, entity_id, payload) VALUES ($1, $2, $3::jsonb)', [
        input.generateId,
        entityId,
        jsonb(graph),
      ])
    }
    for (const alert of input.alerts) {
      await client.query(
        'INSERT INTO alerts (scope, id, rank, payload) VALUES ($1, $2, $3, $4::jsonb)',
        [input.generateId, alert.id, alert.rank, jsonb(alert)],
      )
    }
    await client.query(
      `UPDATE generate_jobs
       SET status = 'done', step = 'Building entity graph', error = NULL, event_count = $2, updated_at = NOW()
       WHERE id = $1`,
      [input.generateId, input.eventCount],
    )
    await client.query(
      `INSERT INTO app_state (key, value) VALUES ('current_generate_id', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [input.generateId],
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function listEntityRows(generateId: string): Promise<EntityTableRow[]> {
  const { rows } = await pool.query<{ payload: EntityTableRow }>(
    'SELECT payload FROM entity_rows WHERE generate_id = $1 ORDER BY rank ASC',
    [generateId],
  )
  return rows.map((r) => r.payload)
}

export async function getEntityDetailRow(scope: string, entityId: string): Promise<EntityDetail | null> {
  const { rows } = await pool.query<{ payload: EntityDetail }>(
    'SELECT payload FROM entity_details WHERE scope = $1 AND entity_id = $2',
    [scope, entityId],
  )
  return rows[0]?.payload ?? null
}

export async function getGraphRow(scope: string, entityId: string): Promise<GraphPayload | null> {
  const { rows } = await pool.query<{ payload: GraphPayload }>(
    'SELECT payload FROM graphs WHERE scope = $1 AND entity_id = $2',
    [scope, entityId],
  )
  return rows[0]?.payload ?? null
}

export async function listAlerts(scope: string): Promise<Alert[]> {
  const { rows } = await pool.query<{ payload: Alert }>(
    'SELECT payload FROM alerts WHERE scope = $1 ORDER BY rank ASC',
    [scope],
  )
  return rows.map((r) => r.payload)
}

export async function getAlertRow(scope: string, id: string): Promise<Alert | null> {
  const { rows } = await pool.query<{ payload: Alert }>(
    'SELECT payload FROM alerts WHERE scope = $1 AND id = $2',
    [scope, id],
  )
  return rows[0]?.payload ?? null
}

