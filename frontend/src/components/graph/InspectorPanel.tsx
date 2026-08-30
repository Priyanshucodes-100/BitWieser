import { Link } from 'react-router-dom'
import { Fact } from '@/components/ui/primitives'
import { formatTs, truncateId } from '@/lib/format'
import type { GraphNode } from '@/types/intel'

export function InspectorPanel({ node }: { node: GraphNode | null }) {
  if (!node) {
    return (
      <aside className="panel p-4">
        <p className="label border-b border-[var(--cw-border)] pb-3">Inspector</p>
        <p className="mt-3 text-sm text-beige-muted">Select a node.</p>
      </aside>
    )
  }

  const entityHref =
    node.properties.cluster && node.properties.cluster !== 'none' ? `/entities/${node.properties.cluster}` : null

  return (
    <aside className="panel overflow-auto p-4">
      <p className="label">{node.kind}</p>
      <h2 className="serif mt-1 text-lg text-white">{node.label}</h2>
      {node.flagged ? (
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-crimson-bright">On path</p>
      ) : null}
      <dl className="mt-3">
        {Object.entries(node.properties).map(([key, value]) => (
          <Fact key={key} k={key} v={pretty(key, value)} />
        ))}
      </dl>
      {entityHref ? (
        <Link to={entityHref} className="btn-pill btn-pill-ghost mt-4 py-1 text-[11px]">
          Entity cluster
        </Link>
      ) : null}
    </aside>
  )
}

function pretty(key: string, value: string): string {
  if (key === 'txid' || key === 'address') return truncateId(value, 10, 6)
  if (key.endsWith('Seen') || key === 'timestamp') {
    try {
      return formatTs(value)
    } catch {
      return value
    }
  }
  if (value.length > 36) return truncateId(value, 12, 6)
  return value
}
