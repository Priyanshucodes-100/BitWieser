import { toRiskLevel } from '@/lib/risk'
import type {
  AlertType,
  EntityDetail,
  EntityTableRow,
  Event,
  GraphEdge,
  GraphNode,
  GraphPayload,
  IpNode,
  LinkedEntity,
  TravelHop,
  Wallet,
} from '@/types/intel'

export const GENERATE_STEPS = [
  'Validating records',
  'Enriching geo and ASN',
  'Scoring risk',
  'Building entity graph',
] as const

export const OVERVIEW_GRAPH_ID = '__all__'

export interface GenerateBundle {
  rows: EntityTableRow[]
  details: Record<string, EntityDetail>
  graphs: Record<string, GraphPayload>
}

function countryCode(raw: string): string {
  const t = raw.trim().toUpperCase()
  if (/^[A-Z]{2}$/.test(t)) return t
  const names: Record<string, string> = {
    INDIA: 'IN',
    NETHERLANDS: 'NL',
    GERMANY: 'DE',
    SINGAPORE: 'SG',
    'UNITED KINGDOM': 'GB',
    UK: 'GB',
    'UNITED STATES': 'US',
    USA: 'US',
    FRANCE: 'FR',
  }
  return names[t] ?? ''
}

function enrichCountry(ip: string, given: string): string {
  const coded = countryCode(given)
  if (coded) return coded
  const first = Number((ip.split('.')[0] ?? '0'))
  if (first >= 100 && first < 110) return 'IN'
  if (first >= 180 && first < 190) return 'NL'
  if (first >= 90 && first < 95) return 'DE'
  if (first >= 45 && first < 50) return 'SG'
  if (first >= 50 && first < 55) return 'GB'
  if (first >= 104 && first < 108) return 'US'
  if (first >= 80 && first < 85) return 'DE'
  return 'XX'
}

function enrichAsn(ip: string, given: string): string {
  if (given.trim()) return given.trim()
  const first = Number((ip.split('.')[0] ?? '0'))
  if (first >= 100 && first < 110) return 'AS24560'
  if (first >= 180 && first < 190) return 'AS49981'
  if (first >= 90 && first < 95) return 'AS24940'
  if (first >= 45 && first < 50) return 'AS20473'
  return 'AS0'
}

function btcOf(ev: Event): number {
  const outs = ev.outputAmounts.reduce((a, b) => a + b, 0)
  if (outs > 0) return outs
  return ev.inputAmounts.reduce((a, b) => a + b, 0)
}

function shortAddr(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function validateEvents(events: Event[]): Event[] {
  const valid: Event[] = []
  for (const ev of events) {
    const ipOk = /^\d{1,3}(\.\d{1,3}){3}$/.test(ev.srcIp) || ev.srcIp === '0.0.0.0'
    const hasKey = Boolean(ev.txid || (ev.srcIp && ev.srcIp !== '0.0.0.0'))
    if (!hasKey || !ipOk) continue
    valid.push(ev)
  }
  return valid
}

function scoreCluster(events: Event[]): { confidence: number; type: AlertType; reasons: EntityDetail['riskBreakdown'] } {
  const uniqueIps = new Set(events.map((e) => e.srcIp))
  const countries = [...new Set(events.map((e) => e.geoCountry).filter((c) => c && c !== 'XX'))]
  const maxFan = Math.max(0, ...events.map((e) => e.outputAddresses.length))
  const totalBtc = events.reduce((a, e) => a + btcOf(e), 0)
  const times = events.map((e) => Date.parse(e.timestamp)).filter((n) => Number.isFinite(n))
  const spanMin = times.length > 1 ? (Math.max(...times) - Math.min(...times)) / 60000 : 999
  const reasons: EntityDetail['riskBreakdown'] = []
  let score = 0.12

  if (maxFan >= 4 && spanMin <= 15) {
    score += 0.34
    reasons.push({
      feature: 'fan_out_speed',
      contribution: 0.34,
      text: `${maxFan}-way split across ${Math.max(1, Math.round(spanMin))} min`,
    })
  } else if (maxFan >= 3) {
    score += 0.18
    reasons.push({ feature: 'output_fanout', contribution: 0.18, text: `${maxFan} outputs on a single hop` })
  }

  if (events.length >= 3 && uniqueIps.size === 1) {
    score += 0.28
    reasons.push({
      feature: 'ip_reuse',
      contribution: 0.28,
      text: `${events.length} transactions first-seen from ${events[0]?.srcIp ?? 'unknown'}`,
    })
  } else if (uniqueIps.size >= 3) {
    score += 0.16
    reasons.push({ feature: 'ip_churn', contribution: 0.16, text: `first-seen IPs across ${uniqueIps.size} peers` })
  }

  if (countries.length >= 3) {
    score += 0.11
    reasons.push({ feature: 'country_hops', contribution: 0.11, text: countries.join(' → ') })
  }

  if (totalBtc >= 1) {
    score += 0.12
    reasons.push({ feature: 'amount_large', contribution: 0.12, text: `${totalBtc.toFixed(3)} BTC moved in cluster` })
  } else if (totalBtc > 0 && totalBtc < 0.001) {
    score += 0.08
    reasons.push({ feature: 'dust_denomination', contribution: 0.08, text: 'sub-0.001 BTC dust-like amounts' })
  }

  const blob = events.map((e) => `${e.txid} ${e.inputAddresses.join(' ')} ${e.outputAddresses.join(' ')}`).join(' ').toLowerCase()
  if (blob.includes('mix')) {
    score += 0.22
    reasons.push({ feature: 'mixer_proximity', contribution: 0.22, text: 'mixer-like address or hop in cluster' })
  }

  if (reasons.length === 0) {
    reasons.push({ feature: 'baseline', contribution: 0.08, text: 'clustered by first-seen IP from capture' })
  }

  let type: AlertType = 'anomaly'
  if (reasons.some((r) => r.feature === 'fan_out_speed')) type = 'layering'
  else if (reasons.some((r) => r.feature === 'mixer_proximity')) type = 'mixer-proximity'
  else if (reasons.some((r) => r.feature === 'ip_reuse' || r.feature === 'ip_churn')) type = 'ip-reuse'

  return { confidence: Math.min(0.97, score), type, reasons }
}

function travelFromEvents(events: Event[]): TravelHop[] {
  const ordered = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  const hops: TravelHop[] = []
  let last = ''
  for (const ev of ordered) {
    const code = ev.geoCountry || 'XX'
    if (code === last) continue
    last = code
    hops.push({
      countryCode: code,
      timestamp: ev.timestamp || '',
      ip: ev.srcIp,
      note: `${ev.srcIp} → ${ev.dstIp}`,
    })
  }
  return hops
}

function graphFromParts(wallets: Wallet[], ips: IpNode[], entityId: string, riskHigh: boolean): GraphPayload {
  const nodes: GraphNode[] = [
    ...wallets.map((w) => ({
      id: w.id,
      kind: 'wallet' as const,
      label: w.label,
      flagged: riskHigh,
      risk: w.risk,
      subtitle: w.address,
      properties: { address: w.address, cluster: entityId, risk: w.risk },
    })),
    ...ips.map((ip) => ({
      id: ip.id,
      kind: 'ip' as const,
      label: ip.ip,
      flagged: false,
      subtitle: ip.countryCode,
      properties: { ip: ip.ip, country: ip.countryCode, asn: ip.asn, cluster: entityId },
    })),
  ]
  const edges: GraphEdge[] = []
  for (let i = 0; i < wallets.length - 1; i++) {
    const from = wallets[i]
    const to = wallets[i + 1]
    if (!from || !to) continue
    edges.push({
      id: `e-${from.id}-${to.id}`,
      source: from.id,
      target: to.id,
      relation: 'hops',
      label: 'hop',
    })
  }
  const firstWallet = wallets[0]
  const firstIp = ips[0]
  if (firstWallet && firstIp) {
    edges.push({
      id: `e-${firstIp.id}-${firstWallet.id}`,
      source: firstIp.id,
      target: firstWallet.id,
      relation: 'broadcast',
      label: 'first-seen',
    })
  }
  return {
    nodes,
    edges,
    focusNodeIds: nodes.map((n) => n.id),
    highlightPath: nodes.map((n) => n.id),
  }
}

function buildOverviewGraph(details: Record<string, EntityDetail>): GraphPayload {
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const seen = new Set<string>()

  const addNode = (node: GraphNode) => {
    if (seen.has(node.id)) return
    seen.add(node.id)
    nodes.push(node)
  }

  const addEdge = (edge: GraphEdge) => {
    const key = `${edge.source}|${edge.target}|${edge.relation}`
    if (seen.has(key)) return
    seen.add(key)
    edges.push(edge)
  }

  for (const detail of Object.values(details)) {
    const { cluster, members, sharedIps, linkedEntities } = detail
    addNode({
      id: cluster.id,
      kind: 'entity',
      label: cluster.name,
      flagged: cluster.risk === 'HIGH',
      risk: cluster.risk,
      subtitle: cluster.displayName,
      properties: {
        cluster: cluster.id,
        risk: cluster.risk,
        hops: cluster.countryHops.join(','),
      },
    })
    for (const wallet of members) {
      const walletId = `wallet:${wallet.address}`
      addNode({
        id: walletId,
        kind: 'wallet',
        label: wallet.label,
        flagged: cluster.risk === 'HIGH',
        risk: wallet.risk,
        subtitle: wallet.address,
        properties: { address: wallet.address, cluster: cluster.id, risk: wallet.risk },
      })
      addEdge({
        id: `e-${cluster.id}-${walletId}`,
        source: cluster.id,
        target: walletId,
        relation: 'pays',
        label: 'wallet',
      })
    }
    for (const ip of sharedIps) {
      addNode({
        id: ip.id,
        kind: 'ip',
        label: ip.ip,
        flagged: false,
        subtitle: ip.countryCode,
        properties: { ip: ip.ip, country: ip.countryCode, asn: ip.asn, cluster: cluster.id },
      })
      addEdge({
        id: `e-${cluster.id}-${ip.id}`,
        source: cluster.id,
        target: ip.id,
        relation: 'broadcast',
        label: 'first-seen',
      })
    }
    for (const linked of linkedEntities) {
      addEdge({
        id: `e-${cluster.id}-${linked.id}`,
        source: cluster.id,
        target: linked.id,
        relation: 'hops',
        label: 'linked',
      })
    }
  }

  const entityIds = Object.keys(details)
  return {
    nodes,
    edges,
    focusNodeIds: entityIds,
    highlightPath: entityIds,
  }
}

export function runGeneratePipeline(rawEvents: Event[]): GenerateBundle {
  if (rawEvents.length === 0) {
    throw new Error('No records in the loaded dataset. Load a capture file or the demo dataset first.')
  }

  const valid = validateEvents(rawEvents)
  if (valid.length === 0) {
    throw new Error(
      `Validation failed: 0/${rawEvents.length} rows have a usable src_ip or txid. Expected headers such as timestamp, src_ip, txid, input_addresses[], output_addresses[], geo_country.`,
    )
  }

  const enriched = valid.map((ev) => ({
    ...ev,
    timestamp: ev.timestamp || new Date().toISOString(),
    geoCountry: enrichCountry(ev.srcIp, ev.geoCountry),
    asn: enrichAsn(ev.srcIp, ev.asn),
    scriptType: ev.scriptType || 'unknown',
  }))

  const groups = new Map<string, Event[]>()
  for (const ev of enriched) {
    const key = ev.srcIp || 'unknown'
    const list = groups.get(key) ?? []
    list.push(ev)
    groups.set(key, list)
  }

  const clusters = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)
  if (clusters.length === 0) {
    throw new Error('Scoring produced no entities from the validated records.')
  }

  const rows: EntityTableRow[] = []
  const details: Record<string, EntityDetail> = {}
  const graphs: Record<string, GraphPayload> = {}
  const drafts: Array<{
    id: string
    name: string
    risk: ReturnType<typeof toRiskLevel>
    ips: Set<string>
    addrs: Set<string>
  }> = []

  clusters.forEach(([ip, group], idx) => {
    const firstRow = group[0]
    if (!firstRow) return
    const { confidence, type, reasons } = scoreCluster(group)
    const risk = toRiskLevel(confidence)
    const addrs = [...new Set(group.flatMap((e) => [...e.inputAddresses, ...e.outputAddresses]))]
    const hops = [...new Set(group.map((e) => e.geoCountry).filter((c) => c && c !== 'XX'))]
    const last = group.reduce((a, b) => (a.timestamp > b.timestamp ? a : b))
    const first = group.reduce((a, b) => (a.timestamp < b.timestamp ? a : b))
    const totalBtc = group.reduce((a, e) => a + btcOf(e), 0)
    const n = idx + 1
    const entityId = `entity-gen-${n}`
    const wallets: Wallet[] = addrs.slice(0, 10).map((address, wi) => ({
      id: `wallet:gen-${n}-${wi + 1}`,
      address,
      label: shortAddr(address),
      firstSeen: first.timestamp,
      lastSeen: last.timestamp,
      txCount: group.filter((e) => e.inputAddresses.includes(address) || e.outputAddresses.includes(address)).length,
      risk,
      clusterId: entityId,
    }))
    const ipList: IpNode[] = [...new Set(group.map((e) => e.srcIp))].slice(0, 6).map((src) => {
      const sample = group.find((e) => e.srcIp === src) ?? firstRow
      return {
        id: `ip:${src}`,
        ip: src,
        country: sample.geoCountry,
        countryCode: sample.geoCountry,
        asn: sample.asn,
        asnOrg: sample.asn,
        firstSeen: first.timestamp,
        lastSeen: last.timestamp,
        tags: ['generated'],
      }
    })
    const name = totalBtc > 0 ? `Entity-${n} · ${totalBtc.toFixed(3)} BTC` : `Entity-${n} · ${group.length} txs`
    const travelHistory = travelFromEvents(group)
    const evidence = group.slice(0, 8).map((e) => ({
      txid: e.txid,
      timestamp: e.timestamp,
      amountBtc: btcOf(e),
      srcIp: e.srcIp,
      dstIp: e.dstIp,
      geoCountry: e.geoCountry,
      asn: e.asn,
      note: `${e.inputAddresses[0] ? shortAddr(e.inputAddresses[0]) : 'in'} → ${e.outputAddresses[0] ? shortAddr(e.outputAddresses[0]) : 'out'}`,
    }))

    drafts.push({
      id: entityId,
      name,
      risk,
      ips: new Set(ipList.map((i) => i.ip)),
      addrs: new Set(addrs),
    })

    rows.push({
      id: entityId,
      rank: n,
      name,
      type,
      risk,
      confidence,
      amountBtc: totalBtc,
      firstActivity: first.timestamp,
      lastActivity: last.timestamp,
      countryHops: hops.length ? hops : [firstRow.geoCountry || 'XX'],
      walletCount: addrs.length,
      ipCount: ipList.length,
    })

    details[entityId] = {
      cluster: {
        id: entityId,
        name: `Entity-${n}`,
        displayName: name,
        wallets: wallets.map((w) => w.id),
        ips: ipList.map((i) => i.id),
        txids: group.map((e) => e.txid),
        risk,
        confidence,
        lastActivity: last.timestamp,
        countryHops: hops.length ? hops : [firstRow.geoCountry || 'XX'],
        summary: `${group.length} validated rows clustered on first-seen IP ${ip}.`,
      },
      members: wallets,
      sharedIps: ipList,
      timeline: evidence,
      riskBreakdown: reasons,
      relatedAlertId: null,
      travelHistory,
      linkedEntities: [],
      totalAmountBtc: totalBtc,
    }
    graphs[entityId] = graphFromParts(wallets, ipList, entityId, risk === 'HIGH')
  })

  for (const draft of drafts) {
    const linked: LinkedEntity[] = []
    for (const other of drafts) {
      if (other.id === draft.id) continue
      const shareIp = [...draft.ips].some((ip) => other.ips.has(ip))
      const shareAddr = [...draft.addrs].some((a) => other.addrs.has(a))
      if (shareIp || shareAddr) linked.push({ id: other.id, name: other.name, risk: other.risk })
    }
    const detail = details[draft.id]
    if (detail) detail.linkedEntities = linked.slice(0, 8)
  }

  rows.sort((a, b) => b.confidence - a.confidence || b.amountBtc - a.amountBtc)
  rows.forEach((row, i) => {
    row.rank = i + 1
  })

  graphs[OVERVIEW_GRAPH_ID] = buildOverviewGraph(details)
  return { rows, details, graphs }
}
