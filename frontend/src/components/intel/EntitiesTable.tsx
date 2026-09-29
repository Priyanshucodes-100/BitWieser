import { Link } from 'react-router-dom'
import { ConfidenceBar, RiskChip } from '@/components/ui/primitives'
import { countryPath, formatBtc, formatTsShort } from '@/lib/format'
import type { AlertType, EntityTableRow, RiskLevel } from '@/types/intel'

export type EntitySortKey = 'rank' | 'entity' | 'risk' | 'date' | 'amount' | 'type'

interface Props {
  rows: EntityTableRow[]
  sortBy: EntitySortKey
  sortDir: 'asc' | 'desc'
  onSort: (col: EntitySortKey) => void
}

const COLS: Array<{ key: EntitySortKey; label: string }> = [
  { key: 'rank', label: 'Rank' },
  { key: 'entity', label: 'Entity' },
  { key: 'risk', label: 'Risk' },
  { key: 'type', label: 'Type' },
  { key: 'amount', label: 'Amount' },
  { key: 'date', label: 'Last activity' },
]

export function EntitiesTable({ rows, sortBy, sortDir, onSort }: Props) {
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
            <th className="px-3 py-2 font-semibold">Txs</th>
            <th className="px-3 py-2 font-semibold">Wallets</th>
            <th className="px-3 py-2 font-semibold">Country movement</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="row-hover border-t border-[var(--cw-border)]">
              <td className="px-3 py-2.5 tabular font-bold text-beige">{row.rank}</td>
              <td className="px-3 py-2.5">
                <Link to={`/entities/${row.id}`} className="font-semibold text-beige hover:text-white">
                  {row.name}
                </Link>
                <p className="text-xs text-beige-muted">{row.id}</p>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <RiskChip level={row.risk} size="sm" />
                  <ConfidenceBar value={row.confidence} level={row.risk} />
                </div>
              </td>
              <td className="px-3 py-2.5">
                <span className="cw-chip px-2.5 py-0.5 text-[11px] uppercase tracking-wide">{row.type}</span>
              </td>
              <td className="px-3 py-2.5 tabular">{formatBtc(row.amountBtc)}</td>
              <td className="px-3 py-2.5 tabular text-beige-dim">{formatTsShort(row.lastActivity)}</td>
              <td className="px-3 py-2.5 tabular">{row.txCount}</td>
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

export function sortEntityRows(
  rows: EntityTableRow[],
  sortBy: EntitySortKey,
  sortDir: 'asc' | 'desc',
): EntityTableRow[] {
  const dir = sortDir === 'desc' ? -1 : 1
  const riskRank: Record<RiskLevel, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }
  return [...rows].sort((a, b) => {
    if (sortBy === 'rank') return (a.rank - b.rank) * dir
    if (sortBy === 'risk') return (riskRank[a.risk] - riskRank[b.risk]) * dir
    if (sortBy === 'amount') return (a.amountBtc - b.amountBtc) * dir
    if (sortBy === 'date') return a.lastActivity.localeCompare(b.lastActivity) * dir
    if (sortBy === 'type') return a.type.localeCompare(b.type) * dir
    return a.name.localeCompare(b.name) * dir
  })
}

export function filterEntityRows(
  rows: EntityTableRow[],
  filters: {
    risk: RiskLevel | 'ALL'
    type: AlertType | 'ALL'
    country: string
    dateFrom: string
    dateTo: string
    minAmount: string
    q: string
  },
): EntityTableRow[] {
  const q = filters.q.trim().toLowerCase()
  const min = filters.minAmount ? Number(filters.minAmount) : NaN
  return rows.filter((row) => {
    if (filters.risk !== 'ALL' && row.risk !== filters.risk) return false
    if (filters.type !== 'ALL' && row.type !== filters.type) return false
    if (filters.country !== 'ALL' && !row.countryHops.includes(filters.country)) return false
    if (filters.dateFrom && row.lastActivity < filters.dateFrom) return false
    if (filters.dateTo && row.lastActivity > `${filters.dateTo}T23:59:59`) return false
    if (Number.isFinite(min) && row.amountBtc < min) return false
    if (
      q &&
      !row.name.toLowerCase().includes(q) &&
      !row.id.toLowerCase().includes(q) &&
      !row.type.includes(q)
    ) {
      return false
    }
    return true
  })
}
