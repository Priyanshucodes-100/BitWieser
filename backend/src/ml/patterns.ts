import type { AlertType, Event } from '../types/intel.js'

const FEATURES = [
  'fan-out',
  'speed',
  'ip reuse',
  'ip churn',
  'countries',
  'amount',
  'dust',
  'mixer',
  'peel chain',
  'coinjoin',
  'common input',
] as const

function totalBtc(ev: Event): number {
  const outs = ev.outputAmounts.reduce((a, b) => a + b, 0)
  if (outs > 0) return outs
  return ev.inputAmounts.reduce((a, b) => a + b, 0)
}

function isPeel(ev: Event): boolean {
  if (ev.outputAmounts.length < 2 || ev.outputAddresses.length < 2) return false
  const total = ev.outputAmounts.reduce((a, b) => a + b, 0)
  if (total <= 0) return false
  const sorted = [...ev.outputAmounts].sort((a, b) => b - a)
  const big = (sorted[0] ?? 0) / total
  const small = (sorted[sorted.length - 1] ?? 0) / total
  return big >= 0.55 && small > 0 && small <= 0.45
}

function peelChainCount(events: Event[]): number {
  const ordered = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  let count = 0
  for (let i = 0; i < ordered.length; i++) {
    const ev = ordered[i]
    if (!ev || !isPeel(ev)) continue
    let bigIdx = 0
    ev.outputAmounts.forEach((amount, idx) => {
      if (amount > (ev.outputAmounts[bigIdx] ?? 0)) bigIdx = idx
    })
    const change = ev.outputAddresses[bigIdx]
    if (!change) continue
    const continues = ordered.slice(i + 1).some((next) => next.inputAddresses.includes(change))
    if (continues) count += 1
  }
  return count
}

function isCoinJoin(ev: Event): boolean {
  if (ev.inputAddresses.length < 3 || ev.outputAddresses.length < 3) return false
  const counts = new Map<string, number>()
  for (const amount of ev.outputAmounts) {
    if (amount <= 0) continue
    const key = amount.toFixed(5)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.values()].some((n) => n >= 3)
}

export function featureVector(events: Event[]): number[] {
  const uniqueIps = new Set(events.map((e) => e.srcIp))
  const countries = new Set(events.map((e) => e.geoCountry).filter((c) => c && c !== 'XX'))
  const maxFan = Math.max(0, ...events.map((e) => e.outputAddresses.length))
  const maxIn = Math.max(0, ...events.map((e) => new Set(e.inputAddresses.filter(Boolean)).size))
  const total = events.reduce((a, e) => a + totalBtc(e), 0)
  const times = events.map((e) => Date.parse(e.timestamp)).filter((n) => Number.isFinite(n))
  const spanMin = times.length > 1 ? (Math.max(...times) - Math.min(...times)) / 60000 : 999
  const blob = events
    .map((e) => `${e.txid} ${e.inputAddresses.join(' ')} ${e.outputAddresses.join(' ')}`)
    .join(' ')
    .toLowerCase()
  const peels = peelChainCount(events)
  const coinjoin = events.some(isCoinJoin) ? 1 : 0
  return [
    Math.min(1, maxFan / 8),
    spanMin <= 15 ? 1 : spanMin <= 60 ? 0.45 : 0,
    events.length >= 3 && uniqueIps.size === 1 ? 1 : 0,
    Math.min(1, uniqueIps.size / 5),
    Math.min(1, countries.size / 4),
    Math.min(1, total / 5),
    total > 0 && total < 0.001 ? 1 : 0,
    blob.includes('mix') ? 1 : 0,
    Math.min(1, peels / 3),
    coinjoin,
    Math.min(1, maxIn / 4),
  ]
}

export function topFeatureLabels(vector: number[]): string {
  return vector
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value)
    .filter((item) => item.value >= 0.45)
    .slice(0, 2)
    .map((item) => FEATURES[item.index] ?? 'structure')
    .join(', ')
}

export function patternExtras(events: Event[]): {
  score: number
  reasons: Array<{ feature: string; contribution: number; text: string }>
  typeHint: AlertType | null
} {
  const reasons: Array<{ feature: string; contribution: number; text: string }> = []
  let score = 0
  let typeHint: AlertType | null = null
  const peels = peelChainCount(events)
  if (peels >= 1) {
    score += 0.2
    reasons.push({
      feature: 'peeling_chain',
      contribution: 0.2,
      text: `${peels} peel hop${peels === 1 ? '' : 's'} (large change output spent again)`,
    })
    typeHint = 'layering'
  }
  const joins = events.filter(isCoinJoin).length
  if (joins >= 1) {
    score += 0.2
    reasons.push({
      feature: 'coinjoin',
      contribution: 0.2,
      text: `${joins} CoinJoin-like tx (many inputs, equal outputs)`,
    })
    if (!typeHint) typeHint = 'mixer-proximity'
  }
  const maxIn = Math.max(0, ...events.map((e) => new Set(e.inputAddresses.filter(Boolean)).size))
  if (maxIn >= 2) {
    score += 0.16
    reasons.push({
      feature: 'common_input',
      contribution: 0.16,
      text: `${maxIn} inputs on one tx treated as one owner (common-input heuristic)`,
    })
  }
  return { score, reasons, typeHint }
}
