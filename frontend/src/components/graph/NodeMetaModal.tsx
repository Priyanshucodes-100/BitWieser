import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Globe, Layers, Wallet, Waypoints, X } from 'lucide-react'
import { RiskChip } from '@/components/ui/primitives'
import { countryName, formatTs, truncateId } from '@/lib/format'
import type { GraphNode, GraphNodeKind } from '@/types/intel'

const KIND_LABEL: Record<GraphNodeKind, string> = {
  wallet: 'Address',
  ip: 'IP peer',
  tx: 'Transaction',
  entity: 'Entity',
}

export function NodeMetaModal({ node, onClose }: { node: GraphNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const cluster = node.properties.cluster
  const entityHref = cluster && cluster !== 'none' ? `/entities/${cluster}` : null
  const hops = (node.properties.hops || '')
    .split(/[,>]/)
    .map((part) => part.trim())
    .filter(Boolean)
  const amount = Number(node.properties.amount)
  const rows = metaRows(node)

  return createPortal(
    <div
      className="fixed inset-0 z-[90] grid place-items-center px-4"
      style={{ background: 'var(--cw-overlay)' }}
      role="presentation"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="node-meta-title"
        className="panel w-full max-w-xl overflow-auto p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <KindGlyph kind={node.kind} flagged={node.flagged} />
            <div className="min-w-0">
              <p className="label">{KIND_LABEL[node.kind]}</p>
              <h2 id="node-meta-title" className="serif mt-1 truncate text-xl text-white">
                {node.label}
              </h2>
              {node.subtitle ? <p className="mt-1 break-all text-xs text-beige-muted">{node.subtitle}</p> : null}
            </div>
          </div>
          <button type="button" className="btn-pill btn-pill-ghost shrink-0 py-1" onClick={onClose} aria-label="Close">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="btn-pill btn-pill-ghost py-0.5 text-[10px] uppercase">{node.kind}</span>
          {node.risk ? <RiskChip level={node.risk} size="sm" /> : null}
          {node.flagged ? (
            <span className="text-[11px] font-semibold uppercase tracking-wide text-crimson-bright">Flagged</span>
          ) : null}
        </div>

        <section className="mt-5">
          <p className="label mb-2">Role in cluster</p>
          <NodeSchema node={node} hops={hops} />
        </section>

        {Number.isFinite(amount) && amount > 0 ? (
          <section className="mt-4">
            <p className="label mb-2">Amount</p>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--cw-track)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(8, amount * 20))}%`,
                  background: 'var(--cw-fg)',
                }}
              />
            </div>
            <p className="mt-1 text-right text-xs tabular text-beige-muted">{amount.toFixed(6)} BTC</p>
          </section>
        ) : null}

        {hops.length > 0 ? (
          <section className="mt-4">
            <p className="label mb-2">Country hops</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {hops.map((hop, index) => (
                <span key={`${hop}-${index}`} className="flex items-center gap-1.5">
                  <span className="btn-pill btn-pill-solid py-0.5 text-[11px]">{countryName(hop)}</span>
                  {index < hops.length - 1 ? <span className="text-beige-muted">-</span> : null}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-5">
          <p className="label mb-2">Metadata</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {rows.map((row) => (
              <article key={row.k} className="rounded-[10px] px-3 py-2" style={{ background: 'var(--cw-raised)' }}>
                <p className="label">{row.k}</p>
                <p className="mt-1 break-all text-sm text-white">{row.v}</p>
              </article>
            ))}
          </div>
        </section>

        {entityHref ? (
          <Link to={entityHref} className="btn-pill btn-pill-ghost mt-5 py-1 text-[11px]" onClick={onClose}>
            Open entity
          </Link>
        ) : null}
      </aside>
    </div>,
    document.body,
  )
}

function KindGlyph({ kind, flagged }: { kind: GraphNodeKind; flagged: boolean }) {
  const Icon = kind === 'wallet' ? Wallet : kind === 'ip' ? Globe : kind === 'tx' ? Layers : Waypoints
  const size = kind === 'entity' ? 44 : kind === 'wallet' ? 38 : 34
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: 'var(--cw-raised)',
        border: flagged ? '2px solid var(--cw-danger-border)' : '1px solid var(--cw-border)',
      }}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  )
}

function NodeSchema({ node, hops }: { node: GraphNode; hops: string[] }) {
  const cluster = node.properties.cluster && node.properties.cluster !== 'none' ? node.properties.cluster : 'cluster'
  return (
    <svg viewBox="0 0 360 88" className="w-full" role="img" aria-label="Node role diagram">
      <line x1="78" y1="44" x2="150" y2="44" stroke="var(--cw-border)" strokeDasharray="2 5" />
      <line x1="210" y1="44" x2="282" y2="44" stroke="var(--cw-border)" strokeDasharray="2 5" />
      <circle cx="52" cy="44" r="18" fill="var(--cw-raised)" stroke="var(--cw-border)" />
      <text x="52" y="48" textAnchor="middle" fill="var(--cw-fg)" fontSize="9">
        {short(cluster, 8)}
      </text>
      <circle cx="180" cy="44" r="24" fill="var(--cw-fg)" />
      <text x="180" y="41" textAnchor="middle" fill="var(--cw-bg)" fontSize="8">
        {KIND_LABEL[node.kind]}
      </text>
      <text x="180" y="53" textAnchor="middle" fill="var(--cw-bg)" fontSize="8">
        {short(node.label, 10)}
      </text>
      <circle cx="308" cy="44" r="18" fill="var(--cw-raised)" stroke="var(--cw-border)" />
      <text x="308" y="48" textAnchor="middle" fill="var(--cw-fg)" fontSize="9">
        {hops[0] || node.properties.country || node.kind}
      </text>
    </svg>
  )
}

function metaRows(node: GraphNode): Array<{ k: string; v: string }> {
  const rows: Array<{ k: string; v: string }> = [
    { k: 'Kind', v: KIND_LABEL[node.kind] },
    { k: 'Name', v: node.label },
  ]
  if (node.subtitle) rows.push({ k: 'Detail', v: node.subtitle })
  for (const [key, value] of Object.entries(node.properties)) {
    if (!value) continue
    rows.push({ k: prettyKey(key), v: prettyValue(key, value) })
  }
  return rows
}

function prettyKey(key: string): string {
  if (key === 'ip') return 'IP'
  if (key === 'txid') return 'Txid'
  if (key === 'asn') return 'ASN'
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (ch) => ch.toUpperCase())
}

function prettyValue(key: string, value: string): string {
  if (key === 'txid' || key === 'address') return truncateId(value, 12, 8)
  if (key.endsWith('Seen') || key === 'timestamp' || key === 'time') {
    try {
      return formatTs(value)
    } catch {
      return value
    }
  }
  return value
}

function short(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}
