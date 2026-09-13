import type { EntityTableRow, GraphEdge, GraphNode, GraphPayload, RiskLevel } from '@/types/intel'

const MAX_ENTITIES = 36
const MAX_NODES = 120

function riskRank(risk?: string): number {
  if (risk === 'HIGH') return 0
  if (risk === 'MEDIUM') return 1
  return 2
}

function sortEntities(nodes: GraphNode[]): GraphNode[] {
  return [...nodes].sort((a, b) => {
    const byRisk = riskRank(a.risk) - riskRank(b.risk)
    if (byRisk !== 0) return byRisk
    if (a.flagged !== b.flagged) return a.flagged ? -1 : 1
    return a.label.localeCompare(b.label)
  })
}

/** Shrink any generate/overview payload so Cytoscape can paint it. */
export function capOverviewGraph(graph: GraphPayload): GraphPayload {
  const entityNodes = sortEntities(graph.nodes.filter((n) => n.kind === 'entity')).slice(0, MAX_ENTITIES)
  const keep = new Set(entityNodes.map((n) => n.id))

  for (const edge of graph.edges) {
    if (keep.has(edge.source)) keep.add(edge.target)
    else if (keep.has(edge.target)) keep.add(edge.source)
    if (keep.size >= MAX_NODES) break
  }

  if (keep.size === 0) {
    graph.nodes.slice(0, MAX_NODES).forEach((n) => keep.add(n.id))
  }

  const nodes = graph.nodes.filter((n) => keep.has(n.id)).slice(0, MAX_NODES)
  const ids = new Set(nodes.map((n) => n.id))
  const edges = graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target))
  const focusNodeIds = nodes.filter((n) => n.kind === 'entity').map((n) => n.id)

  return {
    nodes,
    edges,
    focusNodeIds: focusNodeIds.length ? focusNodeIds : nodes.map((n) => n.id),
    highlightPath: [],
  }
}

/** Always-visible fallback from the ranked table of the uploaded file. */
export function overviewFromRows(rows: EntityTableRow[]): GraphPayload {
  const ranked = [...rows]
    .sort((a, b) => {
      const byRisk = riskRank(a.risk) - riskRank(b.risk)
      if (byRisk !== 0) return byRisk
      return b.confidence - a.confidence
    })
    .slice(0, MAX_ENTITIES)

  const nodes: GraphNode[] = ranked.map((row) => ({
    id: row.id,
    kind: 'entity',
    label: row.name.split('·')[0]?.trim() || row.name,
    flagged: row.risk === 'HIGH',
    risk: row.risk as RiskLevel,
    subtitle: `${row.txCount} txs · ${row.risk}`,
    properties: {
      cluster: row.id,
      risk: row.risk,
      hops: row.countryHops.join(','),
    },
  }))

  const edges: GraphEdge[] = []
  for (let i = 0; i < ranked.length; i++) {
    const left = ranked[i]
    if (!left) continue
    for (let j = i + 1; j < ranked.length; j++) {
      const right = ranked[j]
      if (!right) continue
      const shared = left.countryHops.some((hop) => right.countryHops.includes(hop))
      if (!shared) continue
      edges.push({
        id: `e-${left.id}-${right.id}`,
        source: left.id,
        target: right.id,
        relation: 'hops',
        label: 'overlap',
      })
    }
  }

  return {
    nodes,
    edges,
    focusNodeIds: nodes.map((n) => n.id),
    highlightPath: [],
  }
}

export function visibleIngestGraph(
  graph: GraphPayload | null,
  rows: EntityTableRow[] | null,
): GraphPayload | null {
  if (graph && graph.nodes.length > 0) {
    const capped = capOverviewGraph(graph)
    if (capped.nodes.length > 0) return capped
  }
  if (rows && rows.length > 0) return overviewFromRows(rows)
  return null
}
