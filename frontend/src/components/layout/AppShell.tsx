import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import { ToastHost } from '@/components/ui/Toast'
import { Spotlight, requestSpotlight } from '@/components/layout/Spotlight'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/ingest', label: 'Ingest', end: false },
  { to: '/alerts', label: 'Alerts', end: false },
  { to: '/graph', label: 'Graph', end: false },
  { to: '/about', label: 'About', end: false },
] as const

export function AppShell() {
  const navigate = useNavigate()

  return (
    <div className="flex h-full min-h-0 flex-col bg-black">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 px-5">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-white"
        >
          <span className="grid h-6 w-6 place-items-center rounded-lg text-[10px]" style={{ background: 'var(--cw-raised)', border: '1px solid var(--cw-border)' }}>CW</span>
          ChainWatch
        </button>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn('nav-link', isActive && 'nav-link-active')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => requestSpotlight()} className="kbd" aria-label="Search">
            ⌘K
          </button>
          <span className="btn-pill btn-pill-ghost gap-1.5">
            <WifiOff className="h-3.5 w-3.5" aria-hidden />
            Offline
          </span>
          <button type="button" className="btn-pill btn-pill-primary" onClick={() => navigate('/ingest')}>
            Load data
          </button>
          <ThemeToggle />
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden" aria-label="Mobile">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn('btn-pill btn-pill-ghost shrink-0', isActive && 'btn-pill-solid')}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto h-full max-w-[1400px] px-5 py-6">
          <Outlet />
        </div>
      </main>

      <Spotlight />
      <ToastHost />
    </div>
  )
}
