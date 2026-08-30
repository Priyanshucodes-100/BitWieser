import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { searchConsole } from '@/api/client'
import type { SearchHit } from '@/types/intel'

const SPOTLIGHT_EVENT = 'chainwatch:spotlight'

export function requestSpotlight(): void {
  window.dispatchEvent(new Event(SPOTLIGHT_EVENT))
}

export function Spotlight() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(true)
        return
      }
      if (e.key === '/' && !typing) {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener(SPOTLIGHT_EVENT, onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener(SPOTLIGHT_EVENT, onOpen)
    }
  }, [])

  useEffect(() => {
    setOpen(false)
    setQ('')
  }, [location.pathname])

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 20)
      return () => window.clearTimeout(t)
    }
    return undefined
  }, [open])

  useEffect(() => {
    let cancelled = false
    if (q.trim().length < 2) {
      setHits([])
      return
    }
    void searchConsole(q).then((rows) => {
      if (!cancelled) setHits(rows)
    })
    return () => {
      cancelled = true
    }
  }, [q])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] grid place-items-start pt-[16vh]" style={{ background: 'var(--cw-overlay)' }} role="dialog" aria-label="Search">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Dismiss search" onClick={() => setOpen(false)} />
      <div className="panel relative z-10 w-[min(560px,calc(100%-2rem))] overflow-hidden shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-4">
          <Search className="h-5 w-5 text-beige-muted" aria-hidden />
          <input
            ref={inputRef}
            id="spotlight-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hits[0]) {
                navigate(hits[0].href)
                setOpen(false)
              }
            }}
            placeholder="Search txid, wallet, or IP"
            className="w-full rounded-[8px] bg-transparent text-[16px] text-white placeholder:text-beige-muted"
            aria-label="Search txid, wallet, or IP"
          />
        </div>
        {hits.length > 0 ? (
          <ul className="border-t border-[var(--cw-border)] px-2 pb-2" role="listbox">
            {hits.map((hit) => (
              <li key={`${hit.kind}-${hit.id}`}>
                <button
                  type="button"
                  className="row-hover flex w-full items-center justify-between rounded-[10px] px-4 py-2.5 text-left text-sm text-white"
                  onClick={() => {
                    navigate(hit.href)
                    setOpen(false)
                  }}
                >
                  <span>
                    <span className="mr-2 text-[10px] font-semibold tracking-wider text-beige-muted uppercase">{hit.kind}</span>
                    {hit.label}
                  </span>
                  <span className="text-xs text-beige-muted">{hit.meta}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="border-t border-[var(--cw-border)] px-5 py-3 text-xs text-beige-muted">Type two characters · ⌘K or /</p>
        )}
      </div>
    </div>
  )
}
