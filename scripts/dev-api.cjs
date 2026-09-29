const { spawn } = require('node:child_process')
const path = require('node:path')
const { ping, startEmbeddedPostgres } = require('./embedded-db.cjs')

const root = path.resolve(__dirname, '..')
const backend = path.join(root, 'backend')
const dataDir = path.join(root, '.pgdata-live')

async function main() {
  const existing = 'postgres://chainwatch:chainwatch@127.0.0.1:5432/chainwatch'
  let databaseUrl = existing
  let embedded = null
  if (!(await ping(existing))) {
    console.log('Postgres is not on port 5432. Starting a local database (no Docker)…')
    const started = await startEmbeddedPostgres(dataDir, Number(process.env.EMBEDDED_PG_PORT || 54329))
    databaseUrl = started.url
    embedded = started.embedded
    console.log('Local database is ready.')
  }

  const child = spawn('npx', ['tsx', 'watch', 'src/index.ts'], {
    cwd: backend,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      PGCLIENTENCODING: 'UTF8',
    },
  })

  const stop = async () => {
    if (child.pid) child.kill()
    if (embedded) {
      try {
        await embedded.stop()
      } catch {
        /* ignore */
      }
    }
    process.exit(0)
  }
  process.on('SIGINT', () => void stop())
  process.on('SIGTERM', () => void stop())
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : err)
  process.exit(1)
})
