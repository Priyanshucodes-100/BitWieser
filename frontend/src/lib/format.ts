export function formatBtc(amount: number): string {
  return `${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 6,
  })} BTC`
}

export function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`
}

export function formatTs(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }) + ' UTC'
}

export function formatTsShort(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  })
}

export function truncateId(value: string, head = 10, tail = 6): string {
  if (value.length <= head + tail + 1) return value
  return `${value.slice(0, head)}…${value.slice(-tail)}`
}

export function formatRelative(iso: string, nowIso: string): string {
  const then = new Date(iso).getTime()
  const now = new Date(nowIso).getTime()
  const delta = Math.max(0, now - then)
  const mins = Math.round(delta / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}
