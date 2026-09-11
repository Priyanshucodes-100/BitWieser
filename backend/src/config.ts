import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

const here = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.resolve(here, '../..')

dotenv.config({ path: path.join(backendRoot, '.env') })

export const PORT = Number(process.env.PORT ?? 3001)
export const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://chainwatch:chainwatch@localhost:5432/chainwatch'
export const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173'
export const UPLOAD_DIR = path.resolve(backendRoot, process.env.UPLOAD_DIR ?? 'uploads')
export const DEMO_INGEST_ID = 'ingest-demo'
export const DEMO_SCOPE = 'demo'

export async function ensureUploadDir(): Promise<void> {
  await mkdir(UPLOAD_DIR, { recursive: true })
}
