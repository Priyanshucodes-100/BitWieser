import { useMemo, useState, type ReactNode } from 'react'
import { getAlerts } from '@/api/client'
import { AlertsTable } from '@/components/intel/AlertsTable'
import { EmptyState, ErrorState, PageHeader, PageSkeleton } from '@/components/ui/primitives'
import { useAsync } from '@/hooks/useAsync'
import type { AlertFilters, AlertType, RiskLevel } from '@/types/intel'

const RISK_OPTS: Array<RiskLevel | 'ALL'> = ['ALL', 'HIGH', 'MEDIUM', 'LOW']
const TYPE_OPTS: Array<AlertType | 'ALL'> = ['ALL', 'layering', 'ip-reuse', 'mixer-proximity', 'anomaly']
const COUNTRY_OPTS = ['ALL', 'IN', 'NL', 'DE', 'SG', 'GB', 'US', 'FR'] as const

export function AlertsPage() {
  const [risk, setRisk] = useState<RiskLevel | 'ALL'>('ALL')
  const [type, setType] = useState<AlertType | 'ALL'>('ALL')
  const [country, setCountry] = useState<string>('ALL')
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState<NonNullable<AlertFilters['sortBy']>>('rank')
  const [sortDir, setSortDir] = useState<NonNullable<AlertFilters['sortDir']>>('asc')

  const key = `${risk}|${type}|${country}|${q}|${sortBy}|${sortDir}`
  const state = useAsync(
    () => getAlerts({ risk, type, country, q, sortBy, sortDir }).then((r) => r.data),
    key,
  )

  const onSort = (col: NonNullable<AlertFilters['sortBy']>) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(col)
      setSortDir(col === 'rank' ? 'asc' : 'desc')
    }
  }

  const filterBar = useMemo(
    () => (
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {RISK_OPTS.map((o) => (
          <button
            key={o}
            type="button"
            data-on={risk === o}
            className="filter-pill"
            onClick={() => setRisk(o)}
          >
            {o === 'ALL' ? 'All risk' : o}
          </button>
        ))}
        <span className="mx-1 h-4 w-px" style={{ background: 'var(--cw-border)' }} />
        {TYPE_OPTS.map((o) => (
          <button
            key={o}
            type="button"
            data-on={type === o}
            className="filter-pill"
            onClick={() => setType(o)}
          >
            {o === 'ALL' ? 'All types' : o}
          </button>
        ))}
        <Field label="Country">
          <select
            aria-label="Filter by country hop"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="control py-1"
          >
            {COUNTRY_OPTS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <input
          aria-label="Search alerts"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Entity, wallet, IP…"
          className="control ml-auto w-52"
        />
      </div>
    ),
    [risk, type, country, q],
  )

  return (
    <div>
      <PageHeader kicker="Alerts" title="Ranked leads" />
      {filterBar}
      {state.status === 'loading' ? <PageSkeleton /> : null}
      {state.status === 'error' ? <ErrorState message={state.error.message} onRetry={state.reload} /> : null}
      {state.status === 'ready' && state.data.length === 0 ? (
        <EmptyState
          title="No matching alerts"
          body="Reset filters to show the RansomPay board."
          action={
            <button
              type="button"
              className="btn-pill btn-pill-ghost"
              onClick={() => {
                setRisk('ALL')
                setType('ALL')
                setCountry('ALL')
                setQ('')
              }}
            >
              Reset
            </button>
          }
        />
      ) : null}
      {state.status === 'ready' && state.data.length > 0 ? (
        <AlertsTable rows={state.data} sortBy={sortBy} sortDir={sortDir} onSort={onSort} />
      ) : null}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-beige-muted">
      {label}
      {children}
    </label>
  )
}
