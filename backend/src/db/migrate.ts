import { inspect } from 'node:util'
import { failStaleGenerateJobs } from './queries.js'
import { pool } from './pool.js'
import { SCHEMA_SQL } from './schema.js'
import { seedDemoIfEmpty } from './seed.js'

function dbErrorDetail(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'ECONNREFUSED') {
    return 'connection refused on localhost:5432'
  }
  if (err instanceof Error && err.message.trim()) {
    const first = err.message.split('\n')[0]?.trim()
    return first || err.message
  }
  return inspect(err, { depth: 2, breakLength: 80 })
}

export async function migrate(): Promise<void> {
  try {
    await pool.query(SCHEMA_SQL)
  } catch (err) {
    throw new Error(
      `Cannot reach PostgreSQL (${dbErrorDetail(err)}). From the repo root run npm run live (no Docker), or start Postgres and set DATABASE_URL.`,
      { cause: err },
    )
  }
  await failStaleGenerateJobs()
  await seedDemoIfEmpty()
}
