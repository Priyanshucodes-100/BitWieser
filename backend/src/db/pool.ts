import pg from 'pg'
import { DATABASE_URL } from '../config.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  options: '-c client_encoding=UTF8',
})

export async function pingDb(): Promise<boolean> {
  const client = await pool.connect()
  try {
    await client.query('SELECT 1')
    return true
  } finally {
    client.release()
  }
}
