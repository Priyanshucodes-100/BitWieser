/**
 * No-Docker live console: Node 20 only.
 * Builds the UI, starts a local Postgres if needed, serves UI+API on one port.
 *
 *   npm install
 *   npm run live
 *
 * Open http://localhost:3001
 * If DATABASE_URL is set (Render / Railway / Neon), that database is used instead.
 */
const { spawn, spawnSync } = require('node:child_process')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { Client } = require('pg')

const root = path.resolve(__dirname, '..')
const frontend = path.join(root, 'frontend')
const backend = path.join(root, 'backend')
const dist = path.join(frontend, 'dist')
const dataDir = path.join(root, '.pgdata-live')
const port = Number(process.env.PORT || 3001)
const pgPort = Number(process.env.EMBEDDED_PG_PORT || 54329)

function run(command, args, cwd, extraEnv) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
  })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`)
  }
}

function ensureInstall(dir) {
  if (!fs.existsSync(path.join(dir, 'node_modules'))) {
    console.log(`Installing ${path.basename(dir)}…`)
    run('npm', ['install'], dir)
  }
}

async function pingPg(url) {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 900 })
  try {
    await client.connect()
    await client.query('SELECT 1')
    await client.end()
    return true
  } catch {
    try {
      await client.end()
    } catch {
      /* ignore */
    }
    return false
  }
}

async function waitForHealth(timeoutMs = 60000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const ok = await new Promise((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
        res.resume()
        resolve(res.statusCode === 200)
      })
      req.setTimeout(1500, () => {
        req.destroy()
        resolve(false)
      })
      req.on('error', () => resolve(false))
    })
    if (ok) return true
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

async function startEmbeddedPostgres() {
  const EmbeddedPostgres = (await import('embedded-postgres')).default
  const alreadyInit = fs.existsSync(path.join(dataDir, 'PG_VERSION'))
  const embedded = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: 'chainwatch',
    password: 'chainwatch',
    port: pgPort,
    persistent: true,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: () => {},
    onError: (message) => console.error('[postgres]', message),
  })
  if (!alreadyInit) {
    console.log('Preparing local database (first run only)…')
    await embedded.initialise()
  }
  await embedded.start()
  try {
    await embedded.createDatabase('chainwatch')
  } catch {
    /* exists */
  }
  const url = `postgres://chainwatch:chainwatch@127.0.0.1:${pgPort}/chainwatch`
  const started = Date.now()
  while (Date.now() - started < 20000) {
    if (await pingPg(url)) return { url, embedded }
    await new Promise((r) => setTimeout(r, 400))
  }
  throw new Error('Local database did not become ready.')
}

async function main() {
  ensureInstall(frontend)
  ensureInstall(backend)

  const needBuild = process.argv.includes('--build') || !fs.existsSync(path.join(dist, 'index.html'))
  if (needBuild) {
    console.log('Building UI…')
    run('npm', ['run', 'build'], frontend, { VITE_API_URL: '' })
  }

  let databaseUrl = process.env.DATABASE_URL || ''
  let embedded = null
  if (!databaseUrl) {
    const local = 'postgres://chainwatch:chainwatch@127.0.0.1:5432/chainwatch'
    if (await pingPg(local)) databaseUrl = local
  }
  if (!databaseUrl) {
    console.log('No Docker and no Postgres URL — starting a bundled database…')
    const started = await startEmbeddedPostgres()
    databaseUrl = started.url
    embedded = started.embedded
  }

  console.log(`Starting console on http://127.0.0.1:${port}`)
  const child = spawn('npm', ['start'], {
    cwd: backend,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      FRONTEND_DIST: dist,
      HOST: process.env.HOST || '0.0.0.0',
      PORT: String(port),
      CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
    },
  })

  const ready = await waitForHealth()
  if (ready) {
    console.log(`Open http://127.0.0.1:${port}  (no Docker needed)`)
  }

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
  child.on('exit', (code) => {
    void (async () => {
      if (embedded) {
        try {
          await embedded.stop()
        } catch {
          /* ignore */
        }
      }
      process.exit(code ?? 0)
    })()
  })
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
