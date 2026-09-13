import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getGraph } from '@/api/client'
import { GraphView } from '@/components/graph/GraphCanvas'
import { InspectorPanel } from '@/components/graph/InspectorPanel'
import { ErrorState, PageHeader, PageSkeleton } from '@/components/ui/primitives'
import { useAppState } from '@/context/AppState'
import { useAsync } from '@/hooks/useAsync'
import { capOverviewGraph } from '@/lib/overviewGraph'

export function GraphPage() {
  const [params] = useSearchParams()
  const entityId = params.get('entityId') ?? undefined
  const state = useAsync(() => getGraph(entityId).then((r) => r.data), `graph:${entityId ?? 'all'}`)
  const { selectedNode, selectNode } = useAppState()

  const generatedCluster = Boolean(entityId && entityId !== 'entity-17')
  const graph = useMemo(() => {
    if (state.status !== 'ready') return null
    return entityId ? state.data : capOverviewGraph(state.data)
  }, [state, entityId])
  const focus = graph?.focusNodeIds ?? []

  return (
    <div>
      <PageHeader kicker="Graph" title="Link analysis" description="Click a node to inspect." />
      {state.status === 'loading' ? <PageSkeleton /> : null}
      {state.status === 'error' ? <ErrorState message={state.error.message} onRetry={state.reload} /> : null}
      {state.status === 'ready' && graph ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <GraphView
            nodes={graph.nodes}
            edges={graph.edges}
            focusNodeIds={focus}
            highlightPath={graph.highlightPath}
            onSelect={selectNode}
            autoHighlightPath={Boolean(entityId) && !generatedCluster}
            alwaysLabel={generatedCluster || !entityId}
          />
          <InspectorPanel node={selectedNode} />
        </div>
      ) : null}
    </div>
  )
}
