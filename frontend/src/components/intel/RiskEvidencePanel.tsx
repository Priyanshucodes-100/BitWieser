import { formatBtc, formatTsShort } from '@/lib/format'
import { riskBarClass } from '@/lib/risk'
import { RiskChip } from '@/components/ui/primitives'
import type { Evidence, Reason, RiskLevel } from '@/types/intel'

const EASY: Record<string, string> = {
  fan_out_speed: 'Split fast',
  output_fanout: 'Many outputs',
  ip_reuse: 'Same IP again',
  ip_churn: 'Many IPs',
  country_hops: 'Country jumps',
  amount_large: 'Big amount',
  dust_denomination: 'Tiny amounts',
  mixer_proximity: 'Near a mixer',
  baseline: 'Normal cluster',
  vps_asn: 'VPS network',
  asn_mismatch: 'Mixed networks',
}

function easyName(feature: string): string {
  return EASY[feature] ?? feature.replaceAll('_', ' ')
}

function shortWhy(level: RiskLevel, confidence: number): string {
  const pct = Math.round(confidence * 100)
  if (level === 'HIGH') return `${pct}% · strong signs`
  if (level === 'MEDIUM') return `${pct}% · some signs`
  return `${pct}% · looks ordinary`
}

export function RiskEvidencePanel({
  risk,
  confidence,
  reasons,
  evidence,
}: {
  risk: RiskLevel
  confidence: number
  summary?: string
  reasons: Reason[]
  evidence: Evidence[]
}) {
  const max = Math.max(...reasons.map((r) => r.contribution), 0.0001)
  const topReasons = [...reasons].sort((a, b) => b.contribution - a.contribution).slice(0, 4)
  const topTxs = evidence.slice(0, 4)

  return (
    <section className="panel mb-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="label">Why</p>
        <RiskChip level={risk} size="sm" />
        <span className="text-sm text-white">{shortWhy(risk, confidence)}</span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ul className="space-y-2.5">
          {topReasons.map((reason) => (
            <li key={reason.feature}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-white">{easyName(reason.feature)}</span>
                <span className="tabular text-beige-muted">{Math.round(reason.contribution * 100)}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--cw-track)' }}>
                <div
                  className={`h-full rounded-full ${riskBarClass(risk)}`}
                  style={{ width: `${(reason.contribution / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
          {topReasons.length === 0 ? <li className="text-sm text-beige-muted">No reasons.</li> : null}
        </ul>

        <ul className="space-y-1.5">
          {topTxs.map((ev) => (
            <li key={`${ev.txid}-${ev.timestamp}`} className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-beige-muted">
                {formatTsShort(ev.timestamp)} · {ev.geoCountry}
                {ev.note ? ` · ${ev.note}` : ''}
              </span>
              <span className="shrink-0 tabular text-white">{formatBtc(ev.amountBtc)}</span>
            </li>
          ))}
          {topTxs.length === 0 ? <li className="text-sm text-beige-muted">No txs.</li> : null}
        </ul>
      </div>
    </section>
  )
}
