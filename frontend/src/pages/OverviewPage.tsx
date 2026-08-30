import { Link } from 'react-router-dom'
import { getGraph, getOverviewStats } from '@/api/client'
import { GraphView } from '@/components/graph/GraphCanvas'
import { Banner, ConfidenceBar, ErrorState, KpiCard, PageHeader, PageSkeleton, RiskChip } from '@/components/ui/primitives'
import { useAppState } from '@/context/AppState'
import { useAsync } from '@/hooks/useAsync'
import { formatTsShort } from '@/lib/format'
import { BANNER_COPY } from '@/theme/tokens'

export function OverviewPage() {
  const overview = useAsync(() => getOverviewStats().then((r) => r.data), 'overview')
  const graph = useAsync(() => getGraph('entity-17').then((r) => r.data), 'overview-graph')
  const { selectNode } = useAppState()

  if (overview.status === 'loading') return <PageSkeleton />
  if (overview.status === 'error') return <ErrorState message={overview.error.message} onRetry={overview.reload} />

  return (
    <div>
      <PageHeader kicker="Overview" title="RansomPay" description="Ranked Bitcoin traffic leads." />
      <Banner>{BANNER_COPY}</Banner>

      <section className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <KpiCard label="Events" value={overview.data.totalEvents} />
        <KpiCard label="Wallets" value={overview.data.uniqueWallets} />
        <KpiCard label="IPs" value={overview.data.uniqueIps} />
        <KpiCard label="Flagged" value={overview.data.flaggedEntities} tone="lead" />
        <KpiCard label="High risk" value={overview.data.highRiskCount} tone="crimson" />
      </section>

      <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)]">
        <article className="panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="label text-white">Top alerts</h2>
            <Link to="/alerts" className="btn-pill btn-pill-ghost py-1 text-[11px]">
              All alerts
            </Link>
          </div>
          <ol className="space-y-2">
            {overview.data.topAlerts.map((alert) => (
              <li key={alert.id}>
                <Link to={`/alerts/${alert.id}`} className="list-row">
                  <span className="w-5 tabular text-sm font-semibold text-beige-muted">{alert.rank}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{alert.title}</p>
                    <p className="truncate text-[11px] text-beige-muted">
                      {alert.type} · {alert.countryHops.join(' → ')}
                    </p>
                  </div>
                  <RiskChip level={alert.risk} size="sm" />
                  <div className="hidden w-28 sm:block">
                    <ConfidenceBar value={alert.confidence} level={alert.risk} />
                  </div>
                  <span className="hidden tabular text-[11px] text-beige-muted lg:block">
                    {formatTsShort(alert.lastActivity)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </article>

        <article>
          <p className="mb-2 label">Entity-17 cluster</p>
          {graph.status === 'ready' ? (
            <GraphView
              nodes={graph.data.nodes}
              edges={graph.data.edges}
              focusNodeIds={graph.data.focusNodeIds}
              highlightPath={graph.data.highlightPath}
              onSelect={selectNode}
              autoHighlightPath
            />
          ) : graph.status === 'error' ? (
            <ErrorState message={graph.error.message} onRetry={graph.reload} />
          ) : (
            <PageSkeleton />
          )}
        </article>
      </section>

      <section className="mt-5 flex flex-wrap gap-2">
        <Link to="/ingest" className="btn-pill btn-pill-ghost">
          01 Ingest
        </Link>
        <Link to="/alerts/alert-17" className="btn-pill btn-pill-solid">
          02 Entity-17
        </Link>
        <Link to="/graph?entityId=entity-17" className="btn-pill btn-pill-ghost">
          03 Graph
        </Link>
      </section>
    </div>
  )
}
