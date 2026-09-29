import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getEntity, getGraph } from '@/api/client'
import { buildEntityNeighborhoodGraph } from '@/api/pipeline'
import { GraphView } from '@/components/graph/GraphCanvas'
import { RiskEvidencePanel } from '@/components/intel/RiskEvidencePanel'
import { ConfidenceBar, ErrorState, PageHeader, PageSkeleton, RiskChip } from '@/components/ui/primitives'
import { useAppState } from '@/context/AppState'
import { useAsync } from '@/hooks/useAsync'
import { countryName, countryPath, formatBtc, formatTs, formatTsShort, truncateId } from '@/lib/format'

export function EntityPage() {
  const { id = '' } = useParams()
  const detailState = useAsync(() => getEntity(id).then((r) => r.data), `entity:${id}`)
  const graphState = useAsync(() => getGraph(id).then((r) => r.data), `entity-graph:${id}`)
  const { selectNode } = useAppState()
  const isDemoLead = id === 'entity-17'
  const graph = useMemo(() => {
    if (detailState.status !== 'ready') return null
    if (isDemoLead) {
      return graphState.status === 'ready' ? graphState.data : null
    }
    return buildEntityNeighborhoodGraph(detailState.data)
  }, [detailState, graphState, isDemoLead])

  if (detailState.status === 'loading') return <PageSkeleton />
  if (detailState.status === 'error') {
    return <ErrorState message={detailState.error.message} onRetry={detailState.reload} />
  }

  const { cluster, members, sharedIps, timeline, riskBreakdown, relatedAlertId, travelHistory, linkedEntities, totalAmountBtc } =
    detailState.data

  return (
    <div>
      <PageHeader
        kicker="Entity"
        title={cluster.name}
        description={cluster.displayName}
        actions={
          <div className="flex gap-2">
            <Link to={`/graph?entityId=${cluster.id}`} className="btn-pill btn-pill-primary">
              Open graph
            </Link>
            {relatedAlertId ? (
              <Link to={`/alerts/${relatedAlertId}`} className="btn-pill btn-pill-ghost">
                Open alert
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <RiskChip level={cluster.risk} />
        <div className="w-40">
          <ConfidenceBar value={cluster.confidence} level={cluster.risk} />
        </div>
        <span className="btn-pill btn-pill-ghost py-1 text-[11px]">{formatBtc(totalAmountBtc)}</span>
        <span className="btn-pill btn-pill-ghost py-1 text-[11px]">{countryPath(cluster.countryHops)}</span>
      </div>

      <RiskEvidencePanel
        risk={cluster.risk}
        confidence={cluster.confidence}
        summary={cluster.summary}
        reasons={riskBreakdown}
        evidence={timeline}
      />

      <section className="mb-4">
        <p className="label mb-2">Graph · related entities and connections</p>
        {graph && graph.nodes.length > 0 ? (
          <GraphView
            nodes={graph.nodes}
            edges={graph.edges}
            focusNodeIds={graph.focusNodeIds}
            highlightPath={graph.highlightPath}
            onSelect={selectNode}
            autoHighlightPath={isDemoLead}
            alwaysLabel={!isDemoLead}
          />
        ) : isDemoLead && graphState.status === 'error' ? (
          <ErrorState message={graphState.error.message} onRetry={graphState.reload} />
        ) : isDemoLead && graphState.status === 'loading' ? (
          <PageSkeleton />
        ) : (
          <p className="text-sm text-beige-muted">No graph for this entity.</p>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <section className="panel h-fit p-4">
          <h2 className="label mb-2">Wallet address</h2>
          <ul className="space-y-2">
            {members.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-white">{w.label}</p>
                  <p className="font-mono text-[11px] text-beige-muted">{w.address}</p>
                  <p className="text-[11px] text-beige-muted">
                    {formatTsShort(w.firstSeen)} → {formatTsShort(w.lastSeen)} · {w.txCount} txs
                  </p>
                </div>
                <RiskChip level={w.risk} size="sm" />
              </li>
            ))}
            {members.length === 0 ? <li className="text-sm text-beige-muted">No wallet addresses.</li> : null}
          </ul>
        </section>

        <section className="panel h-fit p-4">
          <h2 className="label mb-2">IP address</h2>
          <ul className="space-y-2">
            {sharedIps.map((ip) => (
              <li key={ip.id} className="flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-mono text-white">{ip.ip}</p>
                  <p className="text-[11px] text-beige-muted">
                    {countryName(ip.countryCode)} · {ip.asn} {ip.asnOrg && ip.asnOrg !== ip.asn ? `· ${ip.asnOrg}` : ''}
                  </p>
                </div>
                <span className="text-xs text-beige-muted">{ip.tags.join(', ') || 'first-seen'}</span>
              </li>
            ))}
            {sharedIps.length === 0 ? <li className="text-sm text-beige-muted">No IP addresses.</li> : null}
          </ul>
        </section>

        <section className="panel h-fit p-4">
          <h2 className="label mb-2">Country movement</h2>
          {travelHistory.length === 0 ? (
            <p className="text-sm text-beige-muted">No travel history in this cluster.</p>
          ) : (
            <ol className="space-y-2">
              {travelHistory.map((hop, i) => (
                <li key={`${hop.countryCode}-${hop.timestamp}-${i}`} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="text-white">
                      {i + 1}. {countryName(hop.countryCode)}
                    </p>
                    <p className="text-[11px] text-beige-muted">
                      {hop.ip}
                      {hop.note ? ` · ${hop.note}` : ''}
                    </p>
                  </div>
                  <span className="tabular text-xs text-beige-muted">{hop.timestamp ? formatTs(hop.timestamp) : '—'}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="panel h-fit p-4">
          <h2 className="label mb-2">Linked entities</h2>
          {linkedEntities.length === 0 ? (
            <p className="text-sm text-beige-muted">No shared wallets or IPs with other generated entities.</p>
          ) : (
            <ul className="space-y-2">
              {linkedEntities.map((ent) => (
                <li key={ent.id} className="flex items-center justify-between gap-3">
                  <Link to={`/entities/${ent.id}`} className="text-sm text-beige">
                    {ent.name}
                  </Link>
                  <RiskChip level={ent.risk} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel h-fit p-4">
          <h2 className="label mb-2">Timeline · amounts and labels</h2>
          <ol className="space-y-2">
            {timeline.map((ev) => (
              <li key={`${ev.txid}-${ev.timestamp}`} className="border-b border-[var(--cw-border)] pb-2 text-xs last:border-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="tabular text-beige-muted">{formatTsShort(ev.timestamp)}</span>
                  <span className="tabular text-white">{formatBtc(ev.amountBtc)}</span>
                </div>
                <p className="mt-1 font-mono text-white">{truncateId(ev.txid, 10, 6)}</p>
                <p className="text-beige-muted">
                  {ev.srcIp} → {ev.dstIp} · {countryName(ev.geoCountry)} · {ev.asn}
                </p>
                {ev.note ? <p className="text-beige-dim">{ev.note}</p> : null}
              </li>
            ))}
            {timeline.length === 0 ? <li className="text-sm text-beige-muted">No timeline.</li> : null}
          </ol>
        </section>
      </div>
    </div>
  )
}
