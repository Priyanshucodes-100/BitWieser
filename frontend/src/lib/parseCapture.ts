import type { Event } from '@/types/intel'

export interface ParseCaptureResult {
  events: Event[]
  parseErrors: number
  error?: string
}

function normKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function pick(row: Record<string, unknown>, aliases: string[]): string {
  const map = new Map<string, unknown>()
  for (const [k, v] of Object.entries(row)) map.set(normKey(k), v)
  for (const alias of aliases) {
    const v = map.get(normKey(alias))
    if (v == null) continue
    if (Array.isArray(v)) return v.map(String).join(';')
    const s = String(v).trim()
    if (s) return s
  }
  return ''
}

function splitList(value: string): string[] {
  if (!value) return []
  return value
    .split(/[;|,]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function num(value: string, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  out.push(cur.trim())
  return out
}

function rowToEvent(row: Record<string, unknown>, index: number): Event | null {
  const srcIp = pick(row, ['src_ip', 'srcIp', 'source_ip', 'ip'])
  const txid = pick(row, ['txid', 'tx_id', 'hash'])
  if (!srcIp && !txid) return null

  const tsRaw = pick(row, ['timestamp', 'time', 'ts'])
  const parsedTs = Date.parse(tsRaw)
  const ts = tsRaw && !Number.isNaN(parsedTs) ? new Date(parsedTs).toISOString() : ''
  const inputs = splitList(pick(row, ['input_addresses[]', 'input_addresses', 'inputs', 'from_address']))
  const outputs = splitList(pick(row, ['output_addresses[]', 'output_addresses', 'outputs', 'to_address']))
  const inAmts = splitList(pick(row, ['input_amounts[]', 'input_amounts'])).map((v) => num(v))
  const outAmts = splitList(pick(row, ['output_amounts[]', 'output_amounts', 'amount', 'amount_btc'])).map((v) => num(v))

  return {
    id: `evt-${index + 1}`,
    timestamp: ts,
    srcIp: srcIp || '0.0.0.0',
    dstIp: pick(row, ['dst_ip', 'dstIp', 'dest_ip']) || srcIp || '0.0.0.0',
    srcPort: Math.round(num(pick(row, ['src_port', 'srcPort']), 0)),
    dstPort: Math.round(num(pick(row, ['dst_port', 'dstPort']), 8333)),
    txid: txid || `unknown-${index + 1}`,
    inputAddresses: inputs,
    outputAddresses: outputs,
    inputAmounts: inAmts,
    outputAmounts: outAmts.length ? outAmts : [num(pick(row, ['amount', 'amount_btc', 'value']))],
    fee: num(pick(row, ['fee'])),
    scriptType: pick(row, ['script_type', 'scriptType']) || '',
    geoCountry: pick(row, ['geo_country', 'geoCountry', 'country', 'country_code']),
    asn: pick(row, ['asn']),
  }
}

function parseCsv(text: string): ParseCaptureResult {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) {
    return { events: [], parseErrors: lines.length, error: 'CSV needs a header row and at least one data row.' }
  }
  const headers = parseCsvLine(lines[0] ?? '')
  let parseErrors = 0
  const events: Event[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i] ?? '')
    const row: Record<string, unknown> = {}
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? ''
    })
    const ev = rowToEvent(row, events.length)
    if (ev) events.push(ev)
    else parseErrors++
  }
  return { events, parseErrors }
}

function flattenJson(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw.filter((x) => x && typeof x === 'object') as Record<string, unknown>[]
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    for (const key of ['events', 'rows', 'data', 'records']) {
      if (Array.isArray(obj[key])) return flattenJson(obj[key])
    }
    return [obj]
  }
  return []
}

function parseJson(text: string): ParseCaptureResult {
  const raw = JSON.parse(text) as unknown
  const rows = flattenJson(raw)
  let parseErrors = 0
  const events: Event[] = []
  for (const row of rows) {
    const ev = rowToEvent(row, events.length)
    if (ev) events.push(ev)
    else parseErrors++
  }
  return { events, parseErrors }
}

function parseJsonl(text: string): ParseCaptureResult {
  let parseErrors = 0
  const events: Event[] = []
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const row = JSON.parse(trimmed) as Record<string, unknown>
      const ev = rowToEvent(row, events.length)
      if (ev) events.push(ev)
      else parseErrors++
    } catch {
      parseErrors++
    }
  }
  return { events, parseErrors }
}

function parseXml(text: string): ParseCaptureResult {
  const doc = new DOMParser().parseFromString(text, 'text/xml')
  if (doc.querySelector('parsererror')) {
    return { events: [], parseErrors: 1, error: 'XML is not well-formed. Check tags and encoding.' }
  }
  const nodes = [...doc.querySelectorAll('event, row, record, item')]
  if (nodes.length === 0) {
    return { events: [], parseErrors: 1, error: 'XML has no <event>, <row>, <record>, or <item> nodes.' }
  }
  let parseErrors = 0
  const events: Event[] = []
  for (const node of nodes) {
    const row: Record<string, unknown> = {}
    for (const child of [...node.children]) {
      row[child.tagName] = child.textContent ?? ''
    }
    for (const attr of [...node.attributes]) {
      row[attr.name] = attr.value
    }
    const ev = rowToEvent(row, events.length)
    if (ev) events.push(ev)
    else parseErrors++
  }
  return { events, parseErrors }
}

export function parseCapture(text: string, fileName: string): ParseCaptureResult {
  const lower = fileName.toLowerCase()
  const trimmed = text.trim()
  if (!trimmed) return { events: [], parseErrors: 1, error: 'The file is empty.' }
  if (lower.endsWith('.json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return parseJson(trimmed)
    } catch {
      return parseJsonl(trimmed)
    }
  }
  if (lower.endsWith('.xml') || trimmed.startsWith('<')) {
    return parseXml(trimmed)
  }
  return parseCsv(trimmed)
}
