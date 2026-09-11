import { Link, useParams } from 'react-router-dom'
import { getAlert, getGraph } from '@/api/client'
import { GraphView } from '@/components/graph/GraphCanvas'
import { ExplainabilityPanel } from '@/components/intel/ExplainabilityPanel'
import { ErrorState, Fact, PageSkeleton, RiskChip, RiskGauge } from '@/components/ui/primitives'
import { useAppState } from '@/context/AppState'
import { useAsync } from '@/hooks/useAsync'
import { truncateId } from '@/lib/format'

export function AlertDetailPage() {
  const { id = '' } = useParams()
  const alertState = useAsync(() => getAlert(id).then((r) => r.data), `alert:${id}`)
  const entityId = alertState.status === 'ready' ? alertState.data.entityId : ''
  const graphState = useAsync(
    () =>
      entityId
        ? getGraph(entityId).then((r) => r.data)
        : Promise.resolve({ nodes: [], edges: [], focusNodeIds: [], highlightPath: [] }),
    `alert-graph:${entityId || 'pending'}`,
  )
  const { selectNode } = useAppState()

  if (alertState.status === 'loading') return <PageSkeleton />
  if (alertState.status === 'error') {
    return <ErrorState message={alertState.error.message} onRetry={alertState.reload} />
  }

  const alert = alertState.data
  const topIp = alert.ips[0]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs text-beige-muted">
          <Link to="/alerts" className="hover:text-white">
            Alerts
          </Link>
          <span className="mx-2 text-beige-muted">/</span>
          {alert.id}
        </p>
        <Link to={`/entities/${alert.entityId}`} className="btn-pill btn-pill-ghost py-1 text-[11px]">
          Entity cluster
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
        <section className="panel flex flex-col gap-4 p-4">
          <div>
            <p className="label">Entity</p>
            <h1 className="serif mt-1 text-xl text-white">{alert.title}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <RiskChip level={alert.risk} />
            <span className="btn-pill btn-pill-ghost py-1 text-[11px] uppercase">{alert.type}</span>
          </div>
          <RiskGauge value={alert.confidence} />
          <dl>
            <Fact k="Path" v={alert.countryHops.join(' → ')} />
            <Fact k="Wallets" v={String(alert.walletCount)} />
            {topIp ? <Fact k="First IP" v={topIp.ip} /> : null}
            {topIp ? <Fact k="ASN" v={`${topIp.countryCode} · ${topIp.asn}`} /> : null}
          </dl>
          <div>
            <p className="label mb-2">Wallets</p>
            <ul className="space-y-1.5">
              {alert.wallets.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-white">{w.label}</span>
                  <span className="font-mono text-beige-muted">{truncateId(w.address, 8, 4)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          {graphState.status === 'ready' && graphState.data.nodes.length > 0 ? (
            <GraphView
              nodes={graphState.data.nodes}
              edges={graphState.data.edges}
              focusNodeIds={graphState.data.focusNodeIds}
              highlightPath={graphState.data.highlightPath}
              onSelect={selectNode}
              autoHighlightPath={alert.entityId === 'entity-17'}
              alwaysLabel={alert.entityId !== 'entity-17'}
            />
          ) : graphState.status === 'error' ? (
            <ErrorState message={graphState.error.message} onRetry={graphState.reload} />
          ) : (
            <PageSkeleton />
          )}
        </section>

        <ExplainabilityPanel alert={alert} />
      </div>
    </div>
  )
}
