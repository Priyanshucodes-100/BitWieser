import { clipOverviewGraph, GENERATE_STEPS, OVERVIEW_GRAPH_ID, runGeneratePipeline } from './pipeline.js'
import { alertsFromGenerated } from './alerts.js'
import {
  createGenerateJob,
  getGenerateJob,
  getGraphRow,
  listEntityRows,
  listEvents,
  persistGenerateResult,
  updateGenerateJob,
  type GenerateJobRow,
} from '../db/queries.js'
import { badRequest, notFound } from '../lib/httpError.js'
import type { EntityTableRow, GraphPayload } from '../types/intel.js'

const STEP_MS = 400

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface GenerateJobPublic {
  jobId: string
  status: GenerateJobRow['status']
  step: string | null
  error: string | null
  eventCount: number | null
  rows?: EntityTableRow[]
  graph?: GraphPayload
}

export async function startGenerate(ingestId: string, eventCount: number): Promise<GenerateJobPublic> {
  if (eventCount <= 0) {
    throw badRequest('Generate data only works after a dataset is loaded. Choose a file or load the demo dataset first.')
  }
  const job = await createGenerateJob(ingestId)
  void runGenerateJob(job.id, ingestId)
  return {
    jobId: job.id,
    status: job.status,
    step: job.step,
    error: job.error,
    eventCount: null,
  }
}

async function runGenerateJob(jobId: string, ingestId: string): Promise<void> {
  try {
    await updateGenerateJob(jobId, { status: 'running', step: GENERATE_STEPS[0] })
    const events = await listEvents(ingestId)
    if (events.length === 0) {
      throw badRequest('No records in the loaded dataset. Load a capture file or the demo dataset first.')
    }

    for (const step of GENERATE_STEPS) {
      await updateGenerateJob(jobId, { status: 'running', step })
      await sleep(STEP_MS)
    }

    const bundle = runGeneratePipeline(events)
    const alerts = alertsFromGenerated(bundle.rows, bundle.details)
    await persistGenerateResult({
      generateId: jobId,
      ingestId,
      eventCount: events.length,
      rows: bundle.rows,
      details: bundle.details,
      graphs: bundle.graphs,
      alerts,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed.'
    await updateGenerateJob(jobId, { status: 'error', step: 'Scoring risk', error: message })
  }
}

export async function getGeneratePublic(jobId: string): Promise<GenerateJobPublic> {
  const job = await getGenerateJob(jobId)
  if (!job) throw notFound(`Generate job ${jobId} not found`)
  const payload: GenerateJobPublic = {
    jobId: job.id,
    status: job.status,
    step: job.step,
    error: job.error,
    eventCount: job.event_count,
  }
  if (job.status === 'done') {
    payload.rows = await listEntityRows(job.id)
    const stored = await getGraphRow(job.id, OVERVIEW_GRAPH_ID)
    payload.graph = stored ? clipOverviewGraph(stored) : {
      nodes: [],
      edges: [],
      focusNodeIds: [],
      highlightPath: [],
    }
  }
  return payload
}
