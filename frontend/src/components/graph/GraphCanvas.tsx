import { lazy, Suspense } from 'react'
import type { GraphViewProps } from './GraphView'

const GraphViewInner = lazy(async () => {
  const mod = await import('./GraphView')
  return { default: mod.GraphView }
})

export function GraphView(props: GraphViewProps) {
  return (
    <Suspense fallback={<div className="panel h-[520px] w-full skel" aria-label="Loading graph" />}>
      <GraphViewInner {...props} />
    </Suspense>
  )
}
