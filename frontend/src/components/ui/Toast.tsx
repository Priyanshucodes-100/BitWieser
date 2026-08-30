import { X } from 'lucide-react'
import { useAppState } from '@/context/AppState'
import { cn } from '@/lib/utils'

export function ToastHost() {
  const { toasts, dismissToast } = useAppState()
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed right-5 top-20 z-[60] flex w-96 max-w-[calc(100%-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'panel pointer-events-auto rounded-[10px] px-4 py-3',
            t.tone === 'ok' && 'toast-ok',
            t.tone === 'warn' && 'toast-warn',
            t.tone === 'info' && 'toast-info',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">
                {t.tone === 'ok' ? 'Success: ' : t.tone === 'warn' ? 'Warning: ' : ''}
                {t.title}
              </p>
              {t.body ? <p className="mt-0.5 text-xs">{t.body}</p> : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              className="hover:underline"
              onClick={() => dismissToast(t.id)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
