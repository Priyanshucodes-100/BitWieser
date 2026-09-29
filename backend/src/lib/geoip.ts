import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export interface GeoHit {
  country: string
  asn: string
}

interface Range {
  start: number
  end: number
  country: string
  asn: string
}

const here = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(here, '../../data/geoip')

let loaded: Range[] | null = null

function ipToInt(ip: string): number | null {
  const parts = ip.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null
  const a = parts[0]
  const b = parts[1]
  const c = parts[2]
  const d = parts[3]
  if (a === undefined || b === undefined || c === undefined || d === undefined) return null
  return (((a << 24) >>> 0) + b * 65536 + c * 256 + d) >>> 0
}

function cidrRange(network: string): { start: number; end: number } | null {
  const [ip, bitsRaw] = network.split('/')
  const start = ipToInt(ip ?? '')
  if (start == null) return null
  const bits = Number(bitsRaw ?? 32)
  if (!Number.isFinite(bits) || bits < 0 || bits > 32) return null
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
  const from = (start & mask) >>> 0
  const to = (from | (~mask >>> 0)) >>> 0
  return { start: from, end: to }
}

function loadSimpleCsv(file: string): Range[] {
  const ranges: Range[] = []
  const text = readFileSync(file, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.toLowerCase().startsWith('network')) continue
    const [network, country, asn] = trimmed.split(',').map((part) => part.trim())
    const span = cidrRange(network ?? '')
    if (!span || !country) continue
    ranges.push({ ...span, country: country.toUpperCase(), asn: asn || '' })
  }
  return ranges
}

function loadGeoLite(blocksFile: string, locationsFile: string): Range[] {
  const countries = new Map<string, string>()
  const loc = readFileSync(locationsFile, 'utf8')
  const locLines = loc.split(/\r?\n/)
  const locHeader = (locLines[0] ?? '').split(',').map((h) => h.trim())
  const idIdx = locHeader.indexOf('geoname_id')
  const ccIdx = locHeader.indexOf('country_iso_code')
  if (idIdx >= 0 && ccIdx >= 0) {
    for (const line of locLines.slice(1)) {
      if (!line.trim()) continue
      const cols = line.split(',')
      const id = cols[idIdx]?.trim()
      const cc = cols[ccIdx]?.trim()
      if (id && cc) countries.set(id, cc.toUpperCase())
    }
  }
  const ranges: Range[] = []
  const blocks = readFileSync(blocksFile, 'utf8').split(/\r?\n/)
  const header = (blocks[0] ?? '').split(',').map((h) => h.trim())
  const netIdx = header.indexOf('network')
  const geoIdx = header.indexOf('geoname_id')
  if (netIdx < 0) return ranges
  for (const line of blocks.slice(1)) {
    if (!line.trim()) continue
    const cols = line.split(',')
    const span = cidrRange(cols[netIdx]?.trim() ?? '')
    if (!span) continue
    const country = countries.get(cols[geoIdx]?.trim() ?? '') ?? ''
    if (!country) continue
    ranges.push({ ...span, country, asn: '' })
  }
  return ranges
}

function loadRanges(): Range[] {
  if (loaded) return loaded
  const blocks = path.join(dataDir, 'GeoLite2-Country-Blocks-IPv4.csv')
  const locations = path.join(dataDir, 'GeoLite2-Country-Locations-en.csv')
  const simple = path.join(dataDir, 'geoip.csv')
  let ranges: Range[] = []
  if (existsSync(blocks) && existsSync(locations)) ranges = loadGeoLite(blocks, locations)
  else if (existsSync(simple)) ranges = loadSimpleCsv(simple)
  ranges.sort((a, b) => a.start - b.start)
  loaded = ranges
  return ranges
}

export function lookupGeo(ip: string): GeoHit | null {
  const n = ipToInt(ip)
  const ranges = loadRanges()
  if (n == null || ranges.length === 0) return null
  let lo = 0
  let hi = ranges.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const row = ranges[mid]
    if (!row) break
    if (n < row.start) hi = mid - 1
    else if (n > row.end) lo = mid + 1
    else return { country: row.country, asn: row.asn }
  }
  return null
}

export function geoipSource(): string {
  const blocks = path.join(dataDir, 'GeoLite2-Country-Blocks-IPv4.csv')
  if (existsSync(blocks)) return 'GeoLite2 CSV'
  if (existsSync(path.join(dataDir, 'geoip.csv'))) return 'backend/data/geoip/geoip.csv'
  return 'first-octet fallback'
}
