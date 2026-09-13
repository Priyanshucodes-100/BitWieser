const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const desktop = path.resolve(__dirname, '..')
const root = path.resolve(desktop, '..')
const frontend = path.join(root, 'frontend')
const backend = path.join(root, 'backend')
const pack = path.join(desktop, 'pack')
const apiOut = path.join(pack, 'api.mjs')
const uiOut = path.join(pack, 'frontend-dist')

function run(command, args, cwd, extraEnv) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
  })
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed in ${cwd}`)
  }
}

if (!fs.existsSync(path.join(backend, 'node_modules'))) {
  run('npm', ['install'], backend)
}

if (!fs.existsSync(path.join(frontend, 'node_modules'))) {
  run('npm', ['install'], frontend)
}

run('npm', ['run', 'build'], frontend, { VITE_API_URL: 'http://127.0.0.1:3001' })

fs.rmSync(pack, { recursive: true, force: true })
fs.mkdirSync(pack, { recursive: true })

run(
  'npx',
  [
    'esbuild',
    path.join(backend, 'src', 'index.ts'),
    '--bundle',
    '--platform=node',
    '--format=esm',
    `--outfile=${apiOut}`,
    '--packages=bundle',
    '--external:pg-native',
  ],
  desktop,
)

let code = fs.readFileSync(apiOut, 'utf8')
if (code.includes('Dynamic require of')) {
  code = `import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
${code.replace(
    /throw Error\('Dynamic require of "' \+ x \+ '" is not supported'\)/g,
    'return require(x)',
  )}`
  fs.writeFileSync(apiOut, code)
}

fs.cpSync(path.join(frontend, 'dist'), uiOut, { recursive: true })

if (!fs.existsSync(apiOut)) throw new Error('pack/api.mjs missing after bundle')
if (!fs.existsSync(path.join(uiOut, 'index.html'))) throw new Error('pack/frontend-dist/index.html missing')

console.log('Desktop resources ready.')
