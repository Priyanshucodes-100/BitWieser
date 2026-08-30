import type { CSSProperties, ReactNode } from 'react'
import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react'
import { formatPct } from '@/lib/format'
import { riskBarClass, riskClass } from '@/lib/risk'
import { cn } from '@/lib/utils'
import type { RiskLevel } from '@/types/intel'

export function RiskChip({ level, size = 'md' }: { level: RiskLevel; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[8px] font-semibold tracking-wider uppercase tabular',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]',
        riskClass(level),
      )}
    >
      {level}
    </span>
  )
}

export function ConfidenceBar({ value, level }: { value: number; level: RiskLevel }) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex min-w-[7rem] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--cw-track)' }} aria-hidden>
        <div className={cn('h-full rounded-full', riskBarClass(level))} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs tabular text-beige">{formatPct(value)}</span>
    </div>
  )
}

export function RiskGauge({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const style = {
    background: `conic-gradient(var(--cw-gauge) ${pct}%, var(--cw-track) 0)`,
  } satisfies CSSProperties
  return (
    <div className="flex items-center gap-4">
      <div className="relative grid h-20 w-20 place-items-center" aria-label={`Confidence ${pct} percent`}>
        <div className="h-20 w-20 rounded-full" style={style} />
        <div className="absolute inset-2 grid place-items-center rounded-full" style={{ background: 'var(--cw-bg)' }}>
          <span className="serif text-2xl tabular" style={{ color: 'var(--cw-fg)' }}>{pct}</span>
        </div>
      </div>
      <div>
        <p className="label">Confidence</p>
        <p className="mt-1 text-xs text-beige-muted">Score, not a verdict</p>
      </div>
    </div>
  )
}

export function KpiCard({
  label,
  value,
  hint,
  tone = 'beige',
}: {
  label: string
  value: string | number
  hint?: string
  tone?: 'beige' | 'crimson' | 'teal' | 'lead'
}) {
  const valueClass =
    tone === 'crimson'
      ? 'text-crimson-bright'
      : tone === 'teal'
        ? 'text-white'
        : tone === 'lead'
          ? 'text-lead'
          : 'text-white'
  return (
    <article className="panel px-5 py-4">
      <p className="label">{label}</p>
      <p className={cn('stat mt-2', valueClass)}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-beige-muted">{hint}</p> : null}
    </article>
  )
}

export function Banner({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-[10px] border px-4 py-2 text-xs"
      style={{ background: 'var(--cw-raised)', borderColor: 'var(--cw-border)', color: 'var(--cw-fg)' }}
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  )
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="label">{kicker}</p>
        <h1 className="serif mt-1 text-[1.85rem] tracking-tight text-white">{title}</h1>
        {description ? <p className="mt-1 text-sm text-beige-muted">{description}</p> : null}
      </div>
      {actions}
    </header>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skel', className)} />
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-4 gap-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  )
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="panel grid place-items-center px-8 py-16 text-center">
      <Inbox className="h-8 w-8 text-beige-muted" aria-hidden />
      <h2 className="mt-3 text-lg font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-beige-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="panel grid place-items-center px-8 py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-crimson-bright" aria-hidden />
      <h2 className="mt-3 text-lg font-semibold text-white">Could not load this view</h2>
      <p className="mt-1 text-sm text-beige-muted">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn-pill btn-pill-ghost mt-4">
          <RefreshCw className="h-4 w-4" aria-hidden />
          Retry
        </button>
      ) : null}
    </div>
  )
}

export function CaveatsBox() {
  return (
    <aside className="rounded-[10px] border px-4 py-2 text-xs" style={{ background: 'var(--cw-raised)', borderColor: 'var(--cw-border)', color: 'var(--cw-muted)' }}>
      IP is first-seen peer, not identity. Synthetic data only.
    </aside>
  )
}

export function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--cw-border)] py-2 last:border-0">
      <dt className="label shrink-0">{k}</dt>
      <dd className="truncate text-right text-sm text-white">{v}</dd>
    </div>
  )
}
