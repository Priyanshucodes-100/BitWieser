import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DEMO_INGEST_ID, UPLOAD_DIR } from '../config.js'
import { ingestStatusFromJob, replaceIngest, type IngestJobRow } from '../db/queries.js'
import { badRequest } from '../lib/httpError.js'
import { events as demoEvents, ingestStatus as demoIngest } from '../seed/demoDataset.js'
import type { IngestResponse } from '../types/intel.js'
import { parseCapture } from './parseCapture.js'

const ALLOWED_EXT = ['.csv', '.json', '.xml'] as const

function extOk(name: string): boolean {
  const lower = name.toLowerCase()
  return ALLOWED_EXT.some((ext) => lower.endsWith(ext))
}

export function toIngestResponse(job: IngestJobRow, message: string): IngestResponse {
  return { data: ingestStatusFromJob(job), message }
}

export async function ingestDemo(): Promise<IngestResponse> {
  const job = await replaceIngest({
    id: DEMO_INGEST_ID,
    kind: 'demo',
    datasetName: demoIngest.datasetName,
    caseName: demoIngest.caseName,
    events: demoEvents,
    parseErrors: 0,
  })
  return toIngestResponse(job, `Loaded ${job.event_count} rows.`)
}

export async function ingestFile(fileName: string, bytes: Buffer): Promise<IngestResponse> {
  if (!extOk(fileName)) {
    throw badRequest('Unsupported file. Accepts .csv, .json, or .xml.')
  }
  const text = bytes.toString('utf8')
  const parsed = parseCapture(text, fileName)
  if (parsed.error && parsed.events.length === 0) {
    throw badRequest(parsed.error)
  }
  if (parsed.events.length === 0) {
    throw badRequest(
      `Could not load ${fileName}: no valid records. Need src_ip or txid on each row, plus headers such as timestamp, input_addresses[], output_addresses[].`,
    )
  }

  const safeName = path.basename(fileName).replace(/[^\w.\-]+/g, '_')
  const stored = `${Date.now()}-${safeName}`
  await writeFile(path.join(UPLOAD_DIR, stored), bytes)

  const job = await replaceIngest({
    kind: 'file',
    datasetName: fileName,
    caseName: demoIngest.caseName,
    events: parsed.events,
    parseErrors: parsed.parseErrors,
    filePath: stored,
  })
  const skipped = parsed.parseErrors ? ` · ${parsed.parseErrors} skipped` : ''
  return toIngestResponse(job, `Loaded ${parsed.events.length} rows${skipped}.`)
}
