const fs = require('node:fs')
const path = require('node:path')
const { Client } = require('pg')

function clearStalePid(databaseDir) {
  const pidFile = path.join(databaseDir, 'postmaster.pid')
  if (!fs.existsSync(pidFile)) return
  const pid = Number(String(fs.readFileSync(pidFile, 'utf8')).split(/\r?\n/)[0])
  if (!pid) {
    fs.rmSync(pidFile, { force: true })
    return
  }
  try {
    process.kill(pid, 0)
  } catch {
    fs.rmSync(pidFile, { force: true })
  }
}

async function ping(url) {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 800 })
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

async function startEmbeddedPostgres(dataDir, pgPort) {
  clearStalePid(dataDir)
  const imported = await import('embedded-postgres')
  const EmbeddedPostgres = imported.default
  if (typeof EmbeddedPostgres !== 'function') {
    throw new Error('Could not load the bundled Postgres package.')
  }
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
    /* already exists */
  }
  const url = `postgres://chainwatch:chainwatch@127.0.0.1:${pgPort}/chainwatch`
  const started = Date.now()
  while (Date.now() - started < 25000) {
    if (await ping(url)) return { url, embedded }
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  throw new Error('Local database did not become ready.')
}

module.exports = { ping, startEmbeddedPostgres }
