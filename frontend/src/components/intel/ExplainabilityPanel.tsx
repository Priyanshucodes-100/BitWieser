import { Link } from 'react-router-dom'
import { CaveatsBox, Fact } from '@/components/ui/primitives'
import { formatBtc, formatTsShort, truncateId } from '@/lib/format'
import type { Alert } from '@/types/intel'

export function ExplainabilityPanel({ alert }: { alert: Alert }) {
  const max = Math.max(...alert.reasons.map((r) => r.contribution), 0.0001)
  return (
    <section className="flex min-h-0 flex-col gap-3 overflow-auto">
      <div className="panel p-4">
        <p className="label mb-2">Why flagged</p>
        <dl>
          {alert.reasons.map((reason) => (
            <Fact key={reason.feature} k={reason.feature.replaceAll('_', ' ')} v={reason.text} />
          ))}
        </dl>
      </div>

      <div className="panel p-4">
        <p className="label mb-3">Ranked reasons</p>
        <ul className="space-y-3">
          {alert.reasons.map((reason) => (
            <li key={reason.feature}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-white">{reason.feature.replaceAll('_', ' ')}</span>
                <span className="tabular text-beige-muted">{reason.contribution.toFixed(2)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--cw-track)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(reason.contribution / max) * 100}%`, background: 'var(--cw-gauge)' }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel p-4">
        <p className="label mb-3">Evidence</p>
        <ul className="space-y-2">
          {alert.evidence.map((ev) => (
            <li key={ev.txid} className="rounded-xl border border-[var(--cw-border)] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[11px] text-white">{truncateId(ev.txid, 10, 6)}</p>
                <p className="tabular text-xs text-white">{formatBtc(ev.amountBtc)}</p>
              </div>
              <p className="mt-1 text-[11px] text-beige-muted">
                {formatTsShort(ev.timestamp)} · {ev.srcIp} → {ev.dstIp}
              </p>
              <p className="text-[11px] text-beige-dim">{ev.note}</p>
            </li>
          ))}
        </ul>
        <Link to={`/graph?entityId=${alert.entityId}`} className="btn-pill btn-pill-ghost mt-3 py-1 text-[11px]">
          Open graph
        </Link>
      </div>

      <CaveatsBox />
    </section>
  )
}
