import { toRiskLevel } from '../lib/risk.js'
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
} from '../types/intel.js'

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

export function buildEntityNeighborhoodGraph(detail: EntityDetail): GraphPayload {
  const { cluster, members, sharedIps, timeline, linkedEntities } = detail
  const nodes: GraphNode[] = []
  const edges: GraphEdge[] = []
  const seen = new Set<string>()

  const addNode = (node: GraphNode) => {
    if (seen.has(node.id)) return
    seen.add(node.id)
    nodes.push(node)
  }
  const addEdge = (edge: GraphEdge) => {
    if (!seen.has(edge.source) || !seen.has(edge.target)) return
    if (seen.has(edge.id)) return
    seen.add(edge.id)
    edges.push(edge)
  }

  addNode({
    id: cluster.id,
    kind: 'entity',
    label: cluster.name,
    flagged: cluster.risk === 'HIGH',
    risk: cluster.risk,
    subtitle: cluster.displayName,
    properties: { cluster: cluster.id, risk: cluster.risk, hops: cluster.countryHops.join(',') },
  })

  for (const wallet of members) {
    addNode({
      id: wallet.id,
      kind: 'wallet',
      label: wallet.label,
      flagged: cluster.risk === 'HIGH',
      risk: wallet.risk,
      subtitle: wallet.address,
      properties: { address: wallet.address, cluster: cluster.id, risk: wallet.risk },
    })
    addEdge({
      id: `e-${cluster.id}-${wallet.id}`,
      source: cluster.id,
      target: wallet.id,
      relation: 'pays',
      label: 'wallet',
    })
  }

  for (let i = 0; i < members.length - 1; i++) {
    const from = members[i]
    const to = members[i + 1]
    if (!from || !to) continue
    addEdge({
      id: `e-${from.id}-${to.id}`,
      source: from.id,
      target: to.id,
      relation: 'hops',
      label: 'hop',
    })
  }

  for (const ip of sharedIps) {
    addNode({
      id: ip.id,
      kind: 'ip',
      label: ip.ip,
      flagged: false,
      subtitle: `${ip.countryCode} · ${ip.asn}`,
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

  const path: string[] = [cluster.id]
  timeline.forEach((ev, i) => {
    const txId = `tx:${ev.txid || i}`
    addNode({
      id: txId,
      kind: 'tx',
      label: ev.note || shortAddr(ev.txid),
      flagged: i === 0 && cluster.risk === 'HIGH',
      subtitle: `${ev.amountBtc.toFixed(3)} BTC`,
      properties: {
        txid: ev.txid,
        amount: String(ev.amountBtc),
        cluster: cluster.id,
        time: ev.timestamp,
      },
    })
    addEdge({
      id: `e-${cluster.id}-${txId}`,
      source: cluster.id,
      target: txId,
      relation: 'pays',
      label: `${ev.amountBtc.toFixed(3)} BTC`,
    })

    const srcId = `ip:${ev.srcIp}`
    if (!seen.has(srcId) && ev.srcIp) {
      addNode({
        id: srcId,
        kind: 'ip',
        label: ev.srcIp,
        flagged: false,
        subtitle: ev.geoCountry || 'peer',
        properties: { ip: ev.srcIp, country: ev.geoCountry, asn: ev.asn, cluster: cluster.id },
      })
      addEdge({
        id: `e-${cluster.id}-${srcId}`,
        source: cluster.id,
        target: srcId,
        relation: 'broadcast',
        label: 'peer',
      })
    }
    if (seen.has(srcId)) {
      addEdge({
        id: `e-${srcId}-${txId}`,
        source: srcId,
        target: txId,
        relation: 'broadcast',
        label: 'broadcast',
      })
    }

    if (ev.dstIp && ev.dstIp !== ev.srcIp) {
      const dstId = `ip:${ev.dstIp}`
      if (!seen.has(dstId)) {
        addNode({
          id: dstId,
          kind: 'ip',
          label: ev.dstIp,
          flagged: false,
          subtitle: ev.geoCountry || 'dst',
          properties: { ip: ev.dstIp, country: ev.geoCountry, cluster: cluster.id },
        })
      }
      addEdge({
        id: `e-${txId}-${dstId}`,
        source: txId,
        target: dstId,
        relation: 'broadcast',
        label: 'p2p',
      })
    }

    const wallet = members[Math.min(i, Math.max(0, members.length - 1))]
    if (wallet) {
      addEdge({
        id: `e-${txId}-${wallet.id}`,
        source: txId,
        target: wallet.id,
        relation: i === 0 ? 'pays' : 'hops',
        label: i === 0 ? 'pays' : 'hop',
      })
    }

    if (!path.includes(srcId) && seen.has(srcId)) path.push(srcId)
    path.push(txId)
    if (wallet && !path.includes(wallet.id)) path.push(wallet.id)
  })

  for (const linked of linkedEntities) {
    addNode({
      id: linked.id,
      kind: 'entity',
      label: linked.name.split('·')[0]?.trim() || linked.name,
      flagged: linked.risk === 'HIGH',
      risk: linked.risk,
      subtitle: 'linked cluster',
      properties: { cluster: linked.id, risk: linked.risk },
    })
    addEdge({
      id: `e-${cluster.id}-${linked.id}`,
      source: cluster.id,
      target: linked.id,
      relation: 'hops',
      label: 'linked',
    })
  }

  const focusNodeIds = nodes.filter((n) => n.properties.cluster === cluster.id).map((n) => n.id)
  return {
    nodes,
    edges,
    focusNodeIds: focusNodeIds.length ? focusNodeIds : nodes.map((n) => n.id),
    highlightPath: path.length > 1 ? path : nodes.map((n) => n.id),
  }
}

const OVERVIEW_ENTITY_CAP = 48

function riskRank(risk: string): number {
  if (risk === 'HIGH') return 0
  if (risk === 'MEDIUM') return 1
  return 2
}

function buildOverviewGraph(details: Record<string, EntityDetail>): GraphPayload {
  const ranked = Object.values(details).sort((a, b) => {
    const byRisk = riskRank(a.cluster.risk) - riskRank(b.cluster.risk)
    if (byRisk !== 0) return byRisk
    return b.cluster.confidence - a.cluster.confidence
  })
  const picked = ranked.slice(0, OVERVIEW_ENTITY_CAP)
  const pickedIds = new Set(picked.map((d) => d.cluster.id))

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
    if (seen.has(key) || !seen.has(edge.source) || !seen.has(edge.target)) return
    seen.add(key)
    edges.push(edge)
  }

  for (const detail of picked) {
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
    const wallet = members[0]
    if (wallet) {
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
    const ip = sharedIps[0]
    if (ip) {
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
      if (!pickedIds.has(linked.id)) continue
      addEdge({
        id: `e-${cluster.id}-${linked.id}`,
        source: cluster.id,
        target: linked.id,
        relation: 'hops',
        label: 'linked',
      })
    }
  }

  const entityIds = picked.map((d) => d.cluster.id)
  return {
    nodes,
    edges,
    focusNodeIds: entityIds,
    highlightPath: [],
  }
}

const OVERVIEW_NODE_CAP = 120

export function clipOverviewGraph(graph: GraphPayload): GraphPayload {
  const entities = [...graph.nodes]
    .filter((n) => n.kind === 'entity')
    .sort((a, b) => {
      const byRisk = riskRank(a.risk ?? '') - riskRank(b.risk ?? '')
      if (byRisk !== 0) return byRisk
      return a.flagged === b.flagged ? 0 : a.flagged ? -1 : 1
    })
    .slice(0, OVERVIEW_ENTITY_CAP)
  const keep = new Set(entities.map((n) => n.id))
  for (const edge of graph.edges) {
    if (keep.has(edge.source)) keep.add(edge.target)
    else if (keep.has(edge.target)) keep.add(edge.source)
    if (keep.size >= OVERVIEW_NODE_CAP) break
  }
  if (keep.size === 0) graph.nodes.slice(0, OVERVIEW_NODE_CAP).forEach((n) => keep.add(n.id))
  const nodes = graph.nodes.filter((n) => keep.has(n.id)).slice(0, OVERVIEW_NODE_CAP)
  const ids = new Set(nodes.map((n) => n.id))
  return {
    nodes,
    edges: graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target)),
    focusNodeIds: nodes.filter((n) => n.kind === 'entity').map((n) => n.id),
    highlightPath: [],
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
    const evidence = group.map((e) => ({
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
      txCount: group.length,
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

  for (const [entityId, detail] of Object.entries(details)) {
    graphs[entityId] = buildEntityNeighborhoodGraph(detail)
  }
  graphs[OVERVIEW_GRAPH_ID] = buildOverviewGraph(details)
  return { rows, details, graphs }
}
