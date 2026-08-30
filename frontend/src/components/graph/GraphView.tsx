import cytoscape, { type Core, type EventObject, type StylesheetJson } from 'cytoscape'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Crosshair, Flag, Fullscreen, Search, ZoomIn, ZoomOut } from 'lucide-react'
import type { GraphEdge, GraphNode, GraphNodeKind } from '@/types/intel'
import { cn } from '@/lib/utils'
import { useTheme, type ThemeName } from '@/theme/ThemeProvider'

function graphPalette(theme: ThemeName) {
  if (theme === 'light') {
    return {
      bg: '#F5F5F5',
      ink: '#2C3E50',
      inkSoft: '#2C3E50',
      label: '#2C3E50',
      labelIdle: '#575757',
    }
  }
  return {
    bg: '#000000',
    ink: '#FFFFFF',
    inkSoft: '#A8A8A8',
    label: '#FFFFFF',
    labelIdle: '#A8A8A8',
  }
}

function stylesheet(theme: ThemeName) {
  const C = graphPalette(theme)
  return [
    {
      selector: 'node',
      style: {
        label: '',
        'font-family': 'Inter, system-ui, sans-serif',
        'font-size': 9,
        'font-weight': 500,
        'text-halign': 'right',
        'text-valign': 'center',
        'text-margin-x': 10,
        color: C.labelIdle,
        'text-outline-width': 0,
        shape: 'ellipse',
        width: 8,
        height: 8,
        'background-color': C.ink,
        'background-opacity': 0.9,
        'border-width': 0,
        'overlay-padding': 6,
      },
    },
    {
      selector: 'node[kind = "wallet"]',
      style: { width: 10, height: 10 },
    },
    {
      selector: 'node[kind = "ip"]',
      style: { width: 8, height: 8 },
    },
    {
      selector: 'node[kind = "tx"]',
      style: { width: 6, height: 6 },
    },
    {
      selector: 'node[kind = "entity"]',
      style: { width: 14, height: 14 },
    },
    {
      selector: 'node.flagged',
      style: {
        width: 11,
        height: 11,
        'background-opacity': 1,
      },
    },
    {
      selector: 'node.path-hl, node.hl',
      style: {
        width: 12,
        height: 12,
        'background-color': C.ink,
        'background-opacity': 1,
        label: 'data(label)',
        color: C.label,
        opacity: 1,
      },
    },
    {
      selector: 'node.active, node:selected',
      style: {
        width: 16,
        height: 16,
        'background-color': C.ink,
        'background-opacity': 1,
        label: 'data(label)',
        color: C.label,
        'font-size': 10,
        'font-weight': 600,
        opacity: 1,
      },
    },
    {
      selector: 'node.dim',
      style: {
        opacity: theme === 'light' ? 0.72 : 0.45,
        label: '',
      },
    },
    {
      selector: 'edge',
      style: {
        width: 1.1,
        'line-color': C.inkSoft,
        'curve-style': 'straight',
        'line-style': 'dotted',
        'line-dash-pattern': [1, 5],
        'target-arrow-shape': 'none',
        'source-arrow-shape': 'none',
        label: '',
        opacity: 1,
      },
    },
    {
      selector: 'edge.path-hl, edge.hl',
      style: {
        width: 1.5,
        'line-color': C.ink,
        'line-style': 'dotted',
        'line-dash-pattern': [1, 4],
        opacity: 1,
      },
    },
    {
      selector: 'edge.dim',
      style: { opacity: theme === 'light' ? 0.72 : 0.45 },
    },
  ] as unknown as StylesheetJson
}

export interface GraphFilters {
  wallet: boolean
  ip: boolean
  tx: boolean
}

export interface GraphViewProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  focusNodeIds?: string[]
  highlightPath?: string[]
  onSelect: (node: GraphNode | null) => void
  className?: string
  autoHighlightPath?: boolean
}

export function GraphView({
  nodes,
  edges,
  focusNodeIds = [],
  highlightPath = [],
  onSelect,
  className,
  autoHighlightPath = true,
}: GraphViewProps) {
  const { theme } = useTheme()
  const palette = graphPalette(theme)
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  const lookup = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const [filters, setFilters] = useState<GraphFilters>({ wallet: true, ip: true, tx: true })
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [pathOn, setPathOn] = useState(autoHighlightPath)
  const [nodeQuery, setNodeQuery] = useState('')
  const [tip, setTip] = useState<{ x: number; y: number; line: string } | null>(null)
  const [mapCursor, setMapCursor] = useState<{ x: number; y: number; down: boolean } | null>(null)

  const elementsKey = `${theme}:${nodes.length}:${edges.length}:${focusNodeIds.join(',')}:${highlightPath.join(',')}`

  useEffect(() => {
    const host = containerRef.current
    if (!host) return

    let cancelled = false
    let cy: Core | null = null
    let ro: ResizeObserver | null = null
    let raf = 0

    const boot = () => {
      if (cancelled || !containerRef.current) return
      const { width, height } = containerRef.current.getBoundingClientRect()
      if (width < 24 || height < 24) {
        raf = requestAnimationFrame(boot)
        return
      }

      const nodeIds = new Set(nodes.map((n) => n.id))
      const validEdges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))

      cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...nodes.map((n) => ({
            data: {
              id: n.id,
              label: n.label,
              kind: n.kind,
              flagged: n.flagged,
              subtitle: n.subtitle,
            },
            classes: n.flagged ? `flagged ${n.kind}` : n.kind,
          })),
          ...validEdges.map((e) => ({
            data: {
              id: e.id,
              source: e.source,
              target: e.target,
              label: e.label,
              relation: e.relation,
            },
          })),
        ],
        style: stylesheet(theme),
        layout: { name: 'preset' },
        minZoom: 0.2,
        maxZoom: 2.8,
        wheelSensitivity: 0.2,
        textureOnViewport: false,
        pixelRatio: 1,
        boxSelectionEnabled: false,
      })
      cyRef.current = cy
      const hostEl = cy.container()
      if (hostEl) {
        hostEl.style.cursor = 'none'
        hostEl.querySelectorAll('canvas').forEach((canvas) => {
          canvas.style.cursor = 'none'
        })
      }

      const restyle = () => {
        if (!cy) return
        applyGraphState(cy, highlightPath, pathOn, selectedIdRef.current)
      }

      const onTapNode = (evt: EventObject) => {
        const id = String(evt.target.id())
        selectedIdRef.current = id
        restyle()
        onSelect(lookup.get(id) ?? null)
      }
      const onTapBg = (evt: EventObject) => {
        if (evt.target !== cy) return
        selectedIdRef.current = null
        restyle()
        onSelect(null)
      }
      const onOver = (evt: EventObject) => {
        const node = lookup.get(String(evt.target.id()))
        if (!node) return
        const pos = evt.renderedPosition
        setTip({ x: pos.x, y: pos.y, line: `${node.label} · ${node.kind}` })
      }

      cy.on('tap', 'node', onTapNode)
      cy.on('tap', onTapBg)
      cy.on('mouseover', 'node', onOver)
      cy.on('mouseout', 'node', () => setTip(null))

      cy.layout({
        name: 'concentric',
        animate: false,
        fit: true,
        padding: 56,
        minNodeSpacing: 42,
        avoidOverlap: true,
        concentric: (n) => n.degree(),
        levelWidth: () => 1,
        startAngle: (3 * Math.PI) / 2,
        sweep: Math.PI * 2,
        clockwise: true,
        equidistant: false,
      }).run()

      const afterLayout = () => {
        if (!cy) return
        cy.resize()
        cy.nodes().forEach((n) => {
          const size = 6 + Math.min(n.degree(), 10) * 1.15
          n.style({ width: size, height: size })
        })
        cy.fit(undefined, 52)
        applyGraphState(cy, highlightPath, pathOn, selectedIdRef.current)
      }
      cy.one('layoutstop', afterLayout)
      requestAnimationFrame(afterLayout)

      ro = new ResizeObserver(() => {
        cy?.resize()
      })
      ro.observe(containerRef.current)
    }

    raf = requestAnimationFrame(boot)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      ro?.disconnect()
      cy?.destroy()
      cyRef.current = null
    }
    // Recreate when the investigation graph identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elementsKey])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.batch(() => {
      cy.nodes().forEach((n) => {
        const kind = n.data('kind') as GraphNodeKind
        const flagged = Boolean(n.data('flagged'))
        const kindOn =
          kind === 'wallet' ? filters.wallet : kind === 'ip' ? filters.ip : kind === 'tx' ? filters.tx : true
        n.style('display', kindOn && (!flaggedOnly || flagged) ? 'element' : 'none')
      })
    })
  }, [filters, flaggedOnly, elementsKey])

  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    applyGraphState(cy, highlightPath, pathOn, selectedIdRef.current)
  }, [pathOn, highlightPath, elementsKey])

  const runSearch = () => {
    const cy = cyRef.current
    if (!cy || !nodeQuery.trim()) return
    const q = nodeQuery.trim().toLowerCase()
    const hit = cy.nodes().filter((n) => {
      const label = String(n.data('label') ?? '').toLowerCase()
      const id = n.id().toLowerCase()
      const sub = String(n.data('subtitle') ?? '').toLowerCase()
      return label.includes(q) || id.includes(q) || sub.includes(q)
    })
    if (hit.nonempty()) {
      const id = hit.first().id()
      selectedIdRef.current = id
      applyGraphState(cy, highlightPath, pathOn, id)
      cy.animate({ fit: { eles: hit.neighborhood().union(hit), padding: 80 }, duration: 250 })
      hit.select()
      onSelect(lookup.get(id) ?? null)
    }
  }

  return (
    <div className={cn('panel flex flex-col overflow-hidden', className)}>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--cw-border)] px-3 py-2.5">
        <ToolbarButton label="Fit graph" onClick={() => cyRef.current?.fit(undefined, 40)}>
          <Fullscreen className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Zoom in"
          onClick={() => {
            const cy = cyRef.current
            if (cy) cy.zoom(cy.zoom() * 1.2)
          }}
        >
          <ZoomIn className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Zoom out"
          onClick={() => {
            const cy = cyRef.current
            if (cy) cy.zoom(cy.zoom() / 1.2)
          }}
        >
          <ZoomOut className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Focus cluster" onClick={() => cyRef.current && fitFocus(cyRef.current, focusNodeIds)}>
          <Crosshair className="h-4 w-4" />
        </ToolbarButton>

        <FilterPill on={filters.wallet} onClick={() => setFilters((f) => ({ ...f, wallet: !f.wallet }))}>
          Wallets
        </FilterPill>
        <FilterPill on={filters.ip} onClick={() => setFilters((f) => ({ ...f, ip: !f.ip }))}>
          IPs
        </FilterPill>
        <FilterPill on={filters.tx} onClick={() => setFilters((f) => ({ ...f, tx: !f.tx }))}>
          Txs
        </FilterPill>
        <FilterPill on={flaggedOnly} onClick={() => setFlaggedOnly((v) => !v)}>
          <Flag className="h-3 w-3" /> Flagged
        </FilterPill>
        <FilterPill on={pathOn} onClick={() => setPathOn((v) => !v)}>
          Vic→Cash1
        </FilterPill>

        <div className="ml-auto flex items-center gap-1.5">
          <Search className="h-3.5 w-3.5 text-beige-muted" aria-hidden />
          <input
            id="graph-node-search"
            value={nodeQuery}
            onChange={(e) => setNodeQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch()
            }}
            placeholder="Find node…"
            aria-label="Search node"
            className="control w-36 py-1 text-xs"
          />
        </div>
      </div>

      <div
        className="graph-stage relative h-[560px] w-full shrink-0"
        style={{ minHeight: 560, background: palette.bg, colorScheme: theme === 'light' ? 'light' : 'dark' }}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setMapCursor({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            down: e.buttons === 1,
          })
        }}
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setMapCursor({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            down: true,
          })
        }}
        onPointerUp={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setMapCursor({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            down: false,
          })
        }}
        onPointerLeave={() => setMapCursor(null)}
      >
        <div ref={containerRef} className="h-full w-full" style={{ width: '100%', height: '100%', minHeight: 560 }} />
        {mapCursor ? (
          <div
            className="graph-map-cursor"
            data-down={mapCursor.down}
            style={{ left: mapCursor.x, top: mapCursor.y }}
          >
            <span className="graph-map-cursor-halo" />
            <span className="graph-map-cursor-dot" />
          </div>
        ) : null}
        {tip ? (
          <div
            className="pointer-events-none absolute z-10 rounded-[8px] px-2.5 py-1 text-[11px]"
            style={{
              left: tip.x + 12,
              top: tip.y + 12,
              background: 'var(--cw-panel)',
              color: 'var(--cw-fg)',
              border: '1px solid var(--cw-border)',
            }}
          >
            {tip.line}
          </div>
        ) : null}
        <GraphLegend theme={theme} />
      </div>
    </div>
  )
}

function FilterPill({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" data-on={on} onClick={onClick} className="filter-pill">
      {children}
    </button>
  )
}

function ToolbarButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-[10px] bg-[var(--cw-raised)] p-1.5 text-beige-dim hover:bg-[var(--cw-raised-hover)] hover:text-white"
    >
      {children}
    </button>
  )
}

function GraphLegend({ theme }: { theme: ThemeName }) {
  const C = graphPalette(theme)
  return (
    <div
      className="absolute bottom-3 left-3 z-10 rounded-[10px] px-3 py-2 text-[10px] uppercase tracking-wider"
      style={{
        background: 'var(--cw-panel)',
        color: 'var(--cw-muted)',
        border: '1px solid var(--cw-border)',
      }}
    >
      <p className="mb-1" style={{ color: C.label }}>
        Legend
      </p>
      <p>
        <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: C.ink }} /> Node
      </p>
      <p>
        <span
          className="mr-1 inline-block h-px w-3 align-middle"
          style={{ borderTop: `1.5px dotted ${C.inkSoft}` }}
        />{' '}
        Link
      </p>
    </div>
  )
}

function fitFocus(cy: Core, ids: string[]) {
  if (ids.length === 0) {
    cy.fit(undefined, 40)
    return
  }
  let col = cy.collection()
  for (const id of ids) {
    const el = cy.getElementById(id)
    if (el.nonempty()) col = col.union(el).union(el.neighborhood())
  }
  if (col.nonempty()) cy.fit(col, 56)
  else cy.fit(undefined, 40)
}

function applyGraphState(cy: Core, path: string[], pathOn: boolean, selectedId: string | null) {
  cy.elements().removeClass('dim path-hl hl active')
  if (selectedId) {
    const node = cy.getElementById(selectedId)
    if (node.empty()) return
    cy.elements().addClass('dim')
    node.removeClass('dim').addClass('active')
    node.neighborhood().removeClass('dim').addClass('hl')
    node.connectedEdges().removeClass('dim').addClass('hl')
    return
  }
  if (!pathOn || path.length === 0) return
  const set = new Set(path)
  cy.elements().addClass('dim')
  for (const id of path) {
    cy.getElementById(id).removeClass('dim').addClass('path-hl')
  }
  cy.edges().forEach((e) => {
    if (set.has(e.source().id()) && set.has(e.target().id())) {
      e.removeClass('dim').addClass('path-hl')
    }
  })
}
