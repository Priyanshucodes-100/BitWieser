import type { Alert, AlertFilters, EntityDetail, EntityTableRow } from '../types/intel.js'

export function filterAndSortAlerts(rows: Alert[], filters: AlertFilters): Alert[] {
  let next = [...rows]
  if (filters.risk && filters.risk !== 'ALL') {
    next = next.filter((a) => a.risk === filters.risk)
  }
  if (filters.type && filters.type !== 'ALL') {
    next = next.filter((a) => a.type === filters.type)
  }
  if (filters.country && filters.country !== 'ALL') {
    next = next.filter((a) => a.countryHops.includes(filters.country as string))
  }
  if (filters.q?.trim()) {
    const q = filters.q.trim().toLowerCase()
    next = next.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.entityId.toLowerCase().includes(q) ||
        a.type.includes(q) ||
        a.wallets.some((w) => w.label.toLowerCase().includes(q) || w.address.toLowerCase().includes(q)) ||
        a.ips.some((ip) => ip.ip.includes(q) || ip.countryCode.toLowerCase() === q),
    )
  }

  const sortBy = filters.sortBy ?? 'rank'
  next.sort((a, b) => {
    const dir = filters.sortDir === 'desc' ? -1 : 1
    if (sortBy === 'rank') return (a.rank - b.rank) * dir
    if (sortBy === 'confidence') return (a.confidence - b.confidence) * dir
    if (sortBy === 'lastActivity') return a.lastActivity.localeCompare(b.lastActivity) * dir
    return a.title.localeCompare(b.title) * dir
  })
  return next
}

export function alertsFromGenerated(
  rows: EntityTableRow[],
  details: Record<string, EntityDetail>,
): Alert[] {
  return rows.map((row) => {
    const detail = details[row.id]
    const reasons = detail?.riskBreakdown ?? []
    const alert: Alert = {
      id: `alert-${row.id}`,
      rank: row.rank,
      entityId: row.id,
      risk: row.risk,
      confidence: row.confidence,
      type: row.type,
      title: row.name,
      summary: detail?.cluster.summary ?? row.name,
      whyFlagged: reasons.map((r) => r.text).join(' · ') || row.name,
      wallets: detail?.members ?? [],
      ips: detail?.sharedIps ?? [],
      evidence: detail?.timeline ?? [],
      reasons,
      lastActivity: row.lastActivity,
      countryHops: row.countryHops,
      walletCount: row.walletCount,
    }
    if (detail) detail.relatedAlertId = alert.id
    return alert
  })
}
