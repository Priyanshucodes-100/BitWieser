import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { ingestStatus as seedIngest } from '@/mocks/demoDataset'
import type { GraphNode, IngestStatus } from '@/types/intel'

export interface ToastItem {
  id: string
  tone: 'ok' | 'warn' | 'info'
  title: string
  body?: string
}

interface AppStateValue {
  ingest: IngestStatus
  selectedNode: GraphNode | null
  toasts: ToastItem[]
  setIngest: (next: IngestStatus) => void
  selectNode: (node: GraphNode | null) => void
  pushToast: (toast: Omit<ToastItem, 'id'>) => void
  dismissToast: (id: string) => void
}

const AppStateContext = createContext<AppStateValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ingest, setIngest] = useState<IngestStatus>(seedIngest)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const pushToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setToasts((prev) => [...prev, { ...toast, id }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4200)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const value = useMemo<AppStateValue>(
    () => ({
      ingest,
      selectedNode,
      toasts,
      setIngest,
      selectNode: setSelectedNode,
      pushToast,
      dismissToast,
    }),
    [ingest, selectedNode, toasts, pushToast, dismissToast],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
