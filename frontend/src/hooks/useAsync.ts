import { useEffect, useRef, useState } from 'react'
import { toError } from '@/lib/utils'

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; error: Error }

export function useAsync<T>(
  factory: () => Promise<T>,
  key: string,
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })
  const [tick, setTick] = useState(0)
  const factoryRef = useRef(factory)
  factoryRef.current = factory

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    factoryRef.current()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', error: toError(error) })
      })
    return () => {
      cancelled = true
    }
  }, [key, tick])

  return {
    ...state,
    reload: () => setTick((n) => n + 1),
  }
}
