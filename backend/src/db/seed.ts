import { DEMO_INGEST_ID, DEMO_SCOPE } from '../config.js'
import { OVERVIEW_GRAPH_ID } from '../services/pipeline.js'
import {
  alerts,
  entities,
  events,
  getEntityDetail,
  graphEdges,
  graphNodes,
  highlightPath,
  ingestStatus,
} from '../seed/demoDataset.js'
import { pool } from './pool.js'

export async function seedDemoIfEmpty(): Promise<void> {
  const { rows } = await pool.query<{ n: string }>('SELECT COUNT(*)::text AS n FROM ingest_jobs')
  if (Number(rows[0]?.n ?? 0) > 0) return
  await seedDemo(true)
}

export async function seedDemo(force: boolean): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    if (force) {
      await client.query('DELETE FROM ingest_jobs WHERE id = $1', [DEMO_INGEST_ID])
      await client.query('DELETE FROM entity_details WHERE scope = $1', [DEMO_SCOPE])
      await client.query('DELETE FROM graphs WHERE scope = $1', [DEMO_SCOPE])
      await client.query('DELETE FROM alerts WHERE scope = $1', [DEMO_SCOPE])
    }

    await client.query(
      `INSERT INTO ingest_jobs (
        id, kind, dataset_name, case_name, event_count, parse_errors, geoip_enriched, last_ingest_at, file_path
      ) VALUES ($1, 'demo', $2, $3, $4, $5, $6, $7, NULL)`,
      [
        DEMO_INGEST_ID,
        ingestStatus.datasetName,
        ingestStatus.caseName,
        events.length,
        ingestStatus.parseErrors,
        ingestStatus.geoipEnriched,
        ingestStatus.lastIngestAt,
      ],
    )

    for (let i = 0; i < events.length; i++) {
      await client.query('INSERT INTO events (ingest_id, seq, payload) VALUES ($1, $2, $3::jsonb)', [
        DEMO_INGEST_ID,
        i,
        JSON.stringify(events[i]),
      ])
    }

    for (const entity of entities) {
      const detail = getEntityDetail(entity.id)
      if (!detail) continue
      await client.query(
        'INSERT INTO entity_details (scope, entity_id, payload) VALUES ($1, $2, $3::jsonb)',
        [DEMO_SCOPE, entity.id, JSON.stringify(detail)],
      )
    }

    const demoGraph = {
      nodes: graphNodes,
      edges: graphEdges,
      focusNodeIds: [...highlightPath],
      highlightPath: [...highlightPath],
    }
    await client.query('INSERT INTO graphs (scope, entity_id, payload) VALUES ($1, $2, $3::jsonb)', [
      DEMO_SCOPE,
      OVERVIEW_GRAPH_ID,
      JSON.stringify(demoGraph),
    ])

    for (const alert of alerts) {
      await client.query(
        'INSERT INTO alerts (scope, id, rank, payload) VALUES ($1, $2, $3, $4::jsonb)',
        [DEMO_SCOPE, alert.id, alert.rank, JSON.stringify(alert)],
      )
    }

    await client.query(
      `INSERT INTO app_state (key, value) VALUES ('current_ingest_id', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [DEMO_INGEST_ID],
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
}
