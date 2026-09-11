import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getGraph } from '@/api/client'
import { GraphView } from '@/components/graph/GraphCanvas'
import { InspectorPanel } from '@/components/graph/InspectorPanel'
import { ErrorState, PageHeader, PageSkeleton } from '@/components/ui/primitives'
import { useAppState } from '@/context/AppState'
import { useAsync } from '@/hooks/useAsync'

export function GraphPage() {
  const [params] = useSearchParams()
  const entityId = params.get('entityId') ?? undefined
  const state = useAsync(() => getGraph(entityId).then((r) => r.data), `graph:${entityId ?? 'all'}`)
  const { selectedNode, selectNode } = useAppState()

  const generatedCluster = Boolean(entityId && entityId !== 'entity-17')
  const focus = useMemo(() => {
    if (state.status !== 'ready') return []
    if (entityId) return state.data.focusNodeIds
    return state.data.highlightPath
  }, [state, entityId])

  return (
    <div>
      <PageHeader kicker="Graph" title="Link analysis" description="Click a node to inspect." />
      {state.status === 'loading' ? <PageSkeleton /> : null}
      {state.status === 'error' ? <ErrorState message={state.error.message} onRetry={state.reload} /> : null}
      {state.status === 'ready' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
          <GraphView
            nodes={state.data.nodes}
            edges={state.data.edges}
            focusNodeIds={focus}
            highlightPath={state.data.highlightPath}
            onSelect={selectNode}
            autoHighlightPath={!generatedCluster}
            alwaysLabel={generatedCluster}
          />
          <InspectorPanel node={selectedNode} />
        </div>
      ) : null}
    </div>
  )
}
