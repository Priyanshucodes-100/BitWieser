import { Link } from 'react-router-dom'
import { ConfidenceBar, RiskChip } from '@/components/ui/primitives'
import { countryPath, formatTsShort } from '@/lib/format'
import type { Alert, AlertFilters } from '@/types/intel'

interface Props {
  rows: Alert[]
  sortBy: NonNullable<AlertFilters['sortBy']>
  sortDir: NonNullable<AlertFilters['sortDir']>
  onSort: (col: NonNullable<AlertFilters['sortBy']>) => void
}

const COLS: Array<{ key: NonNullable<AlertFilters['sortBy']>; label: string }> = [
  { key: 'rank', label: 'Rank' },
  { key: 'entity', label: 'Entity' },
  { key: 'confidence', label: 'Risk / confidence' },
  { key: 'lastActivity', label: 'Last activity' },
]

export function AlertsTable({ rows, sortBy, sortDir, onSort }: Props) {
  return (
    <div className="panel overflow-hidden">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-beige-muted">
          <tr>
            {COLS.map((col) => (
              <th key={col.key} className="px-3 py-2 font-semibold">
                <button
                  type="button"
                  className="hover:text-beige"
                  onClick={() => onSort(col.key)}
                  aria-label={`Sort by ${col.label}`}
                >
                  {col.label}
                  {sortBy === col.key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </button>
              </th>
            ))}
            <th className="px-3 py-2 font-semibold">Type</th>
            <th className="px-3 py-2 font-semibold">Wallets</th>
            <th className="px-3 py-2 font-semibold">Country hops</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="row-hover border-t border-[var(--cw-border)]">
              <td className="px-3 py-2.5 tabular font-bold text-beige">{row.rank}</td>
              <td className="px-3 py-2.5">
                <Link to={`/alerts/${row.id}`} className="font-semibold text-beige hover:text-white">
                  {row.title}
                </Link>
                <p className="text-xs text-beige-muted">{row.entityId}</p>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <RiskChip level={row.risk} size="sm" />
                  <ConfidenceBar value={row.confidence} level={row.risk} />
                </div>
              </td>
              <td className="px-3 py-2.5 tabular text-beige-dim">{formatTsShort(row.lastActivity)}</td>
              <td className="px-3 py-2.5">
                <span className="cw-chip px-2.5 py-0.5 text-[11px] uppercase tracking-wide">
                  {row.type}
                </span>
              </td>
              <td className="px-3 py-2.5 tabular">{row.walletCount}</td>
              <td className="px-3 py-2.5">
                <span className="tabular text-xs text-beige-dim">
                  {countryPath(row.countryHops)}
                  {row.countryHops.length > 2 ? ' · multi-hop' : ''}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
