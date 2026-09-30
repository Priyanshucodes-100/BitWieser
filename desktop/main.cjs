const { app, BrowserWindow, dialog } = require('electron')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const http = require('node:http')
const path = require('node:path')
const { Client } = require('pg')

const API_PORT = 3001
const API_URL = `http://127.0.0.1:${API_PORT}`
const UI_HOST = '127.0.0.1'
const PG_EMBEDDED_PORT = 54329
const EXISTING_PG = {
  host: '127.0.0.1',
  port: 5432,
  user: 'chainwatch',
  password: 'chainwatch',
  database: 'chainwatch',
}

let mainWindow = null
let splashWindow = null
let apiChild = null
let apiLog = ''
let staticServer = null
let embeddedPg = null
let stopping = false

function isPackaged() {
  return app.isPackaged
}

function projectRoot() {
  return isPackaged() ? process.resourcesPath : path.resolve(__dirname, '..')
}

function frontendDist() {
  if (isPackaged()) return path.join(process.resourcesPath, 'frontend-dist')
  const packed = path.join(__dirname, 'pack', 'frontend-dist')
  if (fs.existsSync(path.join(packed, 'index.html'))) return packed
  return path.join(projectRoot(), 'frontend', 'dist')
}

function apiEntry() {
  if (isPackaged()) return path.join(process.resourcesPath, 'api.mjs')
  return path.join(__dirname, 'pack', 'api.mjs')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fetchOk(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume()
      resolve(res.statusCode >= 200 && res.statusCode < 500)
    })
    req.setTimeout(timeoutMs, () => {
      req.destroy()
      resolve(false)
    })
    req.on('error', () => resolve(false))
  })
}

function lastApiLog() {
  const text = apiLog.trim()
  if (!text) return 'No API log.'
  return text.slice(-1200)
}

async function waitForHealth(timeoutMs = 45000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (await fetchOk(`${API_URL}/health`)) return true
    if (!apiChild) return false
    await sleep(400)
  }
  return false
}

async function waitForPostgres(connectionString, timeoutMs = 20000) {
  const started = Date.now()
  let last = ''
  while (Date.now() - started < timeoutMs) {
    const client = new Client({ connectionString, connectionTimeoutMillis: 800 })
    try {
      await client.connect()
      await client.query('SELECT 1')
      await client.end()
      return
    } catch (err) {
      last = err instanceof Error ? err.message : String(err)
      try {
        await client.end()
      } catch {
        /* ignore */
      }
      await sleep(400)
    }
  }
  throw new Error(`Local database did not become ready. ${last}`)
}

function splashHtml(message) {
  const safe = String(message).replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]))
  return `<!doctype html><html><head><meta charset="utf-8"><title>ChainWatch</title>
<style>
  html,body{margin:0;height:100%;background:#050505;color:#f5f5dc;font-family:Inter,Segoe UI,sans-serif}
  main{height:100%;display:grid;place-items:center;padding:32px}
  p{max-width:420px;text-align:center;line-height:1.5;font-size:15px}
</style></head><body><main><p>${safe}</p></main></body></html>`
}

function showSplash(message) {
  if (!splashWindow || splashWindow.isDestroyed()) {
    splashWindow = new BrowserWindow({
      width: 420,
      height: 220,
      frame: false,
      resizable: false,
      show: true,
      backgroundColor: '#050505',
    })
  }
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml(message))}`)
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close()
  splashWindow = null
}

function createMainWindow(uiUrl) {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'ChainWatch',
    backgroundColor: '#050505',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  mainWindow.loadURL(uiUrl)
  mainWindow.webContents.on('did-fail-load', (_event, code, desc, url) => {
    console.error('Window failed to load', code, desc, url)
  })
  mainWindow.on('closed', () => {
    mainWindow = null
    if (process.platform !== 'darwin') app.quit()
  })
}

function findFreePort(start) {
  return new Promise((resolve, reject) => {
    const server = http.createServer()
    server.listen(start, UI_HOST, () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
    server.on('error', () => {
      if (start > 5200) reject(new Error('No free local port for the app window'))
      else findFreePort(start + 1).then(resolve, reject)
    })
  })
}

function startStaticServer(root, port) {
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.woff2': 'font/woff2',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
  }
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0])
      let file = path.normalize(path.join(root, urlPath === '/' ? 'index.html' : urlPath))
      if (!file.startsWith(root)) {
        res.writeHead(403)
        res.end()
        return
      }
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        file = path.join(root, 'index.html')
      }
      fs.readFile(file, (err, data) => {
        if (err) {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' })
        res.end(data)
      })
    })
    server.listen(port, UI_HOST, () => resolve(server))
    server.on('error', reject)
  })
}

function explainError(err) {
  if (err == null || err === '') return 'Unknown startup error.'
  if (typeof err === 'string') return err
  if (err instanceof Error && err.message) return err.message
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = http.createServer()
    server.once('error', () => resolve(false))
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true))
    })
  })
}

async function canConnect(url) {
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

async function canUseExistingPostgres() {
  return canConnect(
    `postgres://${EXISTING_PG.user}:${EXISTING_PG.password}@${EXISTING_PG.host}:${EXISTING_PG.port}/${EXISTING_PG.database}`,
  )
}

async function startEmbeddedPostgres() {
  const running = `postgres://chainwatch:chainwatch@127.0.0.1:${PG_EMBEDDED_PORT}/chainwatch`
  if (await canConnect(running)) return running

  let port = PG_EMBEDDED_PORT
  if (!(await isPortFree(port))) {
    port = PG_EMBEDDED_PORT + 1
    while (!(await isPortFree(port))) {
      port += 1
      if (port > PG_EMBEDDED_PORT + 20) {
        throw new Error('No free local port for the database.')
      }
    }
  }

  const EmbeddedPostgres = (await import('embedded-postgres')).default
  const databaseDir = path.join(app.getPath('userData'), 'pgdata-utf8')
  clearStalePid(databaseDir)
  const alreadyInit = fs.existsSync(path.join(databaseDir, 'PG_VERSION'))
  let pgLog = ''
  embeddedPg = new EmbeddedPostgres({
    databaseDir,
    user: 'chainwatch',
    password: 'chainwatch',
    port,
    persistent: true,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: (message) => {
      pgLog += String(message)
    },
    onError: (message) => {
      pgLog += String(message)
    },
  })
  try {
    if (!alreadyInit) await embeddedPg.initialise()
    await embeddedPg.start()
  } catch (err) {
    const detail = explainError(err)
    const tail = pgLog.trim().slice(-700)
    throw new Error(`Local database did not start.\n${detail}${tail ? `\n\n${tail}` : ''}`)
  }
  try {
    await embeddedPg.createDatabase('chainwatch')
  } catch {
    /* already exists */
  }
  const url = `postgres://chainwatch:chainwatch@127.0.0.1:${port}/chainwatch`
  await waitForPostgres(url)
  return url
}

function startBackend(databaseUrl, uiOrigin) {
  const entry = apiEntry()
  if (!fs.existsSync(entry)) {
    throw new Error(`Backend runner missing. From desktop/ run npm run prepare:resources, then rebuild the installer.`)
  }
  apiLog = ''
  apiChild = spawn(process.execPath, [entry], {
    cwd: path.dirname(entry),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      HOST: '127.0.0.1',
      PORT: String(API_PORT),
      DATABASE_URL: databaseUrl,
      CORS_ORIGIN: uiOrigin,
      UPLOAD_DIR: path.join(app.getPath('userData'), 'uploads'),
      PGCLIENTENCODING: 'UTF8',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  const collect = (buf) => {
    const text = buf.toString()
    apiLog += text
    process.stdout.write(text)
  }
  apiChild.stdout.on('data', collect)
  apiChild.stderr.on('data', collect)
  apiChild.on('exit', (code) => {
    apiChild = null
    if (!stopping && code && code !== 0) {
      apiLog += `\nAPI exited with code ${code}\n`
    }
  })
}

async function boot() {
  showSplash('Starting ChainWatch…')

  const dist = frontendDist()
  if (!fs.existsSync(path.join(dist, 'index.html'))) {
    throw new Error('App UI is missing. From desktop/ run npm run prepare:resources once.')
  }

  const existingDbUrl = `postgres://${EXISTING_PG.user}:${EXISTING_PG.password}@${EXISTING_PG.host}:${EXISTING_PG.port}/${EXISTING_PG.database}`
  const apiAlreadyUp = await fetchOk(`${API_URL}/health`)

  if (apiAlreadyUp && !isPackaged() && (await fetchOk('http://127.0.0.1:5173'))) {
    closeSplash()
    createMainWindow('http://127.0.0.1:5173')
    return
  }

  const uiPort = await findFreePort(5173)
  const uiOrigin = `http://${UI_HOST}:${uiPort}`

  if (!apiAlreadyUp) {
    if (!(await isPortFree(API_PORT))) {
      throw new Error(
        'Port 3001 is already in use by another program. Close that program, then open ChainWatch again.',
      )
    }
    showSplash('Starting the local database…')
    const databaseUrl =
      !isPackaged() && (await canUseExistingPostgres()) ? existingDbUrl : await startEmbeddedPostgres()
    showSplash('Starting the local API…')
    startBackend(databaseUrl, `${uiOrigin},http://localhost:${uiPort}`)
    if (!(await waitForHealth())) {
      throw new Error(`The local API did not start.\n\n${lastApiLog()}`)
    }
  }

  staticServer = await startStaticServer(dist, uiPort)
  closeSplash()
  createMainWindow(uiOrigin)
}

async function shutdown() {
  stopping = true
  if (apiChild) {
    apiChild.kill()
    apiChild = null
  }
  if (staticServer) {
    await new Promise((resolve) => staticServer.close(resolve))
    staticServer = null
  }
  if (embeddedPg) {
    try {
      await embeddedPg.stop()
    } catch {
      /* ignore */
    }
    embeddedPg = null
  }
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    try {
      await boot()
    } catch (err) {
      closeSplash()
      const message = explainError(err)
      dialog.showErrorBox('ChainWatch could not start', message)
      app.quit()
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    void shutdown()
  })
}
