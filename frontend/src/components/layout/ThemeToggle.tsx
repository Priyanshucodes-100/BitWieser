import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/theme/ThemeProvider'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="theme-toggle" role="group" aria-label="Theme">
      <button
        type="button"
        aria-label="Dark theme"
        aria-pressed={theme === 'dark'}
        onClick={() => setTheme('dark')}
      >
        <Moon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Light theme"
        aria-pressed={theme === 'light'}
        onClick={() => setTheme('light')}
      >
        <Sun className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
